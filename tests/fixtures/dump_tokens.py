#!/usr/bin/env python3
"""Dump tokenization tensors for a single (query, doc) pair as JSON to stdout.

Usage: python dump_tokens.py <model_dir> <max_length>
Stdin: {"query": str, "doc": str}
Stdout: {"input_ids": [int,...], "attention_mask": [int,...], "token_type_ids": [int,...]}
        OR {"error": str}

Used exclusively by tests/integration/reranker-tokenizer-equivalence.test.ts to
compare against @xenova/transformers output. Kept out of the production
reranker_server.py to avoid muddying that protocol with a test-only path.
"""
import sys
import json
from pathlib import Path


def main():
    try:
        from tokenizers import Tokenizer
    except ImportError as e:
        sys.stdout.write(json.dumps({'error': f'import failed: {e}'}))
        return

    if len(sys.argv) < 3:
        sys.stdout.write(json.dumps({'error': 'usage: dump_tokens.py <model_dir> <max_length>'}))
        return

    model_dir = Path(sys.argv[1]).resolve()
    max_length = int(sys.argv[2])

    try:
        tok = Tokenizer.from_file(str(model_dir / 'tokenizer.json'))
        tok.enable_truncation(max_length=max_length, strategy='only_second')
        tok.enable_padding(length=max_length)
    except Exception as e:
        sys.stdout.write(json.dumps({'error': f'tokenizer load failed: {e}'}))
        return

    try:
        req = json.loads(sys.stdin.read())
        enc = tok.encode(req['query'], req['doc'])
        sys.stdout.write(json.dumps({
            'input_ids': list(enc.ids),
            'attention_mask': list(enc.attention_mask),
            'token_type_ids': list(enc.type_ids),
        }))
    except Exception as e:
        sys.stdout.write(json.dumps({'error': str(e)}))


if __name__ == '__main__':
    main()
