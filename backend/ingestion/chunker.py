import tiktoken
from typing import List, Dict, Any

class TokenRecursiveChunker:
    """
    Intelligent token-based recursive text splitter.
    Splits text by double newlines, single newlines, and spaces, checking the token
    length of chunks using tiktoken to guarantee bounds.
    """
    def __init__(self, chunk_size: int = 800, chunk_overlap: int = 150):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        try:
            self.tokenizer = tiktoken.get_encoding("cl100k_base")
        except Exception:
            # Fallback to cl100k_base directly
            self.tokenizer = tiktoken.get_encoding("cl100k_base")

    def count_tokens(self, text: str) -> int:
        """Count exact number of tokens in a string."""
        return len(self.tokenizer.encode(text))

    def chunk_document(self, parsed_pages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Chunks list of pages. Keeps track of page numbers.
        Returns List[Dict] with 'content', 'page_number', and 'chunk_index'.
        """
        all_chunks = []
        chunk_idx = 0
        
        for page in parsed_pages:
            page_num = page["page_number"]
            page_text = page["text"]
            
            if not page_text.strip():
                continue
                
            page_chunks = self._split_text(page_text)
            
            for chunk_text in page_chunks:
                all_chunks.append({
                    "chunk_index": chunk_idx,
                    "content": chunk_text,
                    "page_number": page_num
                })
                chunk_idx += 1
                
        return all_chunks

    def _split_text(self, text: str) -> List[str]:
        """Recursively splits text of a single page into chunks of max chunk_size tokens."""
        separators = ["\n\n", "\n", " ", ""]
        
        def _recursive_split(text_to_split: str, current_seps: List[str]) -> List[str]:
            # Base Case: text is small enough
            if self.count_tokens(text_to_split) <= self.chunk_size:
                return [text_to_split]
            
            # Base Case: no more separators to try, split by words
            if not current_seps:
                words = text_to_split.split()
                chunks = []
                current_chunk = []
                for word in words:
                    current_chunk.append(word)
                    if self.count_tokens(" ".join(current_chunk)) >= self.chunk_size:
                        chunks.append(" ".join(current_chunk))
                        # Backtrack slightly for overlap
                        current_chunk = current_chunk[-max(1, int(self.chunk_overlap / 10)):]
                if current_chunk:
                    chunks.append(" ".join(current_chunk))
                return chunks
            
            separator = current_seps[0]
            splits = text_to_split.split(separator)
            
            chunks = []
            current_doc = []
            
            for split in splits:
                if not split.strip():
                    continue
                    
                # If a single split is larger than chunk_size, split recursively with next separator
                if self.count_tokens(split) > self.chunk_size:
                    if current_doc:
                        chunks.append(separator.join(current_doc))
                        current_doc = []
                    chunks.extend(_recursive_split(split, current_seps[1:]))
                else:
                    # Try to add current split to existing chunk
                    test_chunk = separator.join(current_doc + [split]) if current_doc else split
                    if self.count_tokens(test_chunk) <= self.chunk_size:
                        current_doc.append(split)
                    else:
                        # Current chunk is full, commit it
                        if current_doc:
                            chunks.append(separator.join(current_doc))
                        
                        # Build overlap context
                        overlap_doc = []
                        for prev in reversed(current_doc):
                            test_overlap = separator.join([prev] + overlap_doc + [split])
                            if self.count_tokens(test_overlap) <= self.chunk_size and \
                               self.count_tokens(separator.join([prev] + overlap_doc)) <= self.chunk_overlap:
                                overlap_doc.insert(0, prev)
                            else:
                                break
                        current_doc = overlap_doc + [split]
            
            if current_doc:
                chunks.append(separator.join(current_doc))
                
            return chunks

        return _recursive_split(text, separators)
