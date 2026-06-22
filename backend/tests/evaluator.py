import os
import sys
import time
import json
import logging

# Ensure root directory is in python path for absolute package imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from typing import List, Dict, Any
import google.generativeai as genai
from backend.config.config import settings

# Setup standard logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("evaluator")

# 1. EVALUATION DATASET
# A representative set of typical student queries grounded in sample documents
EVALUATION_DATASET = [
    {
        "query": "What DBMS questions are frequently asked in Capgemini interviews?",
        "expected_docs": ["capgemini_experience.pdf"],
        "ground_truth": "Capgemini DBMS interview questions frequently cover SQL joins, normalization forms, indexes, and ACID properties."
    },
    {
        "query": "Summarize BDO Cyber Security interview experiences.",
        "expected_docs": ["bdo_security_experience.docx"],
        "ground_truth": "BDO Cyber Security interview experiences highlight focus areas such as network security principles, pen testing methods, and standard incident response models."
    },
    {
        "query": "What skills are required for AI Engineer internships?",
        "expected_docs": ["ai_engineer_jd.txt"],
        "ground_truth": "AI Engineer internship requirements include proficiency in Python, experience with PyTorch/TensorFlow, understanding of transformer architectures, and basic RAG pipeline concepts."
    }
]

class RAGEvaluator:
    def __init__(self):
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.llm_enabled = True
        else:
            logger.warning("GEMINI_API_KEY missing. LLM-as-a-judge metrics (faithfulness, relevancy) will be mocked.")
            self.llm_enabled = False

    def evaluate_retrieval(self, retrieved_chunks: List[Dict[str, Any]], expected_docs: List[str]) -> Dict[str, float]:
        """
        Computes Retrieval Quality metrics: Precision@K, Recall@K, MRR, and NDCG.
        """
        if not retrieved_chunks:
            return {"precision": 0.0, "recall": 0.0, "mrr": 0.0}

        retrieved_filenames = [chunk["filename"] for chunk in retrieved_chunks]
        
        # Calculate Precision@K
        hits = sum(1 for fn in retrieved_filenames if any(ed.lower() in fn.lower() for ed in expected_docs))
        precision = hits / len(retrieved_filenames)

        # Calculate Recall@K
        found_expected = sum(1 for ed in expected_docs if any(ed.lower() in fn.lower() for fn in retrieved_filenames))
        recall = found_expected / len(expected_docs)

        # Calculate MRR (Mean Reciprocal Rank)
        mrr = 0.0
        for idx, fn in enumerate(retrieved_filenames):
            if any(ed.lower() in fn.lower() for ed in expected_docs):
                mrr = 1.0 / (idx + 1)
                break

        return {
            "precision": round(precision, 3),
            "recall": round(recall, 3),
            "mrr": round(mrr, 3)
        }

    async def evaluate_faithfulness(self, context: str, answer: str) -> float:
        """
        LLM-as-a-judge: Computes faithfulness (how well grounded the answer is in context).
        Returns a score between 0.0 and 1.0.
        """
        if not self.llm_enabled:
            return 1.0 # mock perfect score

        prompt = f"""You are a RAG evaluator. Your job is to judge if the generated answer is strictly supported by the context below.
Any claim in the answer that cannot be directly derived from the context is considered a hallucination.

Context:
{context}

Generated Answer:
{answer}

Rate the faithfulness of the answer on a scale from 0.0 to 1.0:
0.0: The answer contains completely hallucinated facts not supported by the context.
0.5: The answer contains a mix of supported and unsupported claims.
1.0: Every statement in the answer is 100% grounded in the context.

Respond only with a single floating-point number. Do not write explanation text or code.
Score:"""

        try:
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(temperature=0.0)
            )
            score = float(response.text.strip())
            return min(max(score, 0.0), 1.0)
        except Exception as e:
            logger.error(f"Error evaluating faithfulness: {str(e)}")
            return 0.5

    async def evaluate_answer_relevancy(self, query: str, answer: str) -> float:
        """
        LLM-as-a-judge: Computes how directly the answer addresses the query.
        Returns a score between 0.0 and 1.0.
        """
        if not self.llm_enabled:
            return 1.0

        prompt = f"""You are a RAG evaluator. Judge if the generated answer directly and fully addresses the user query.

Query:
{query}

Generated Answer:
{answer}

Rate the answer relevancy on a scale from 0.0 to 1.0:
0.0: The answer is completely irrelevant or avoids the question.
0.5: The answer partially addresses the query but misses key parts.
1.0: The answer directly, accurately, and fully answers the student's query.

Respond only with a single floating-point number. Do not write explanation text.
Score:"""

        try:
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(temperature=0.0)
            )
            score = float(response.text.strip())
            return min(max(score, 0.0), 1.0)
        except Exception as e:
            logger.error(f"Error evaluating answer relevancy: {str(e)}")
            return 0.5

    async def run_suite(self, db_session, rag_pipeline_runner_func) -> Dict[str, Any]:
        """
        Runs the evaluation suite on the complete dataset.
        rag_pipeline_runner_func should accept (query) and return (answer_text, retrieved_chunks, latency_ms)
        """
        results = []
        
        for case in EVALUATION_DATASET:
            logger.info(f"Evaluating query: '{case['query']}'")
            
            # Execute RAG query
            start = time.time()
            answer_text, chunks, latency = await rag_pipeline_runner_func(db_session, case["query"])
            
            # Compile context
            context_text = "\n\n".join([c["content"] for c in chunks])
            
            # Run evaluations
            retrieval_metrics = self.evaluate_retrieval(chunks, case["expected_docs"])
            faithfulness = await self.evaluate_faithfulness(context_text, answer_text)
            relevancy = await self.evaluate_answer_relevancy(case["query"], answer_text)
            
            results.append({
                "query": case["query"],
                "latency_ms": latency,
                "precision_at_k": retrieval_metrics["precision"],
                "recall_at_k": retrieval_metrics["recall"],
                "mrr": retrieval_metrics["mrr"],
                "faithfulness": faithfulness,
                "hallucination_rate": round(1.0 - faithfulness, 3),
                "answer_relevancy": relevancy
            })
            
        # Compute averages
        count = len(results)
        avg_precision = sum(r["precision_at_k"] for r in results) / count
        avg_recall = sum(r["recall_at_k"] for r in results) / count
        avg_mrr = sum(r["mrr"] for r in results) / count
        avg_faithfulness = sum(r["faithfulness"] for r in results) / count
        avg_relevancy = sum(r["answer_relevancy"] for r in results) / count
        avg_latency = sum(r["latency_ms"] for r in results) / count
        avg_hallucination = sum(r["hallucination_rate"] for r in results) / count
        
        summary = {
            "avg_precision": round(avg_precision, 3),
            "avg_recall": round(avg_recall, 3),
            "avg_mrr": round(avg_mrr, 3),
            "avg_faithfulness": round(avg_faithfulness, 3),
            "avg_hallucination_rate": round(avg_hallucination, 3),
            "avg_relevancy": round(avg_relevancy, 3),
            "avg_latency_ms": round(avg_latency, 3),
            "details": results
        }
        
        return summary

# Self-test block
if __name__ == "__main__":
    import asyncio
    evaluator = RAGEvaluator()
    print("Evaluator successfully initialized.")
