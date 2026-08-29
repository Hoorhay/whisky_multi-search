# run with `python3 whisky_convert.py tasting_notes.txt`
import sys

def parse_whisky_file(file_path):
    whiskies = []
    noses = []
    tastes = []
    finishes = []
    scores = []

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read().strip()

    # Split the document into blocks separated by blank lines
    blocks = [b.strip() for b in content.split('\n\n') if b.strip()]

    for block in blocks:
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        if not lines:
            continue

        # The first line of each block is the whisky name
        whiskies.append(lines[0])

        for line in lines[1:]:
            if line.startswith('N:'):
                noses.append(line[2:].strip())
            elif line.startswith('T:'):
                tastes.append(line[2:].strip())
            elif line.startswith('F:'):
                finishes.append(line[2:].strip())
            elif line.startswith('S:'):
                scores.append(line[2:].strip())

    outputs = {
        'whisky.txt': whiskies,
        'nose.txt': noses,
        'taste.txt': tastes,
        'finish.txt': finishes,
        'score.txt': scores,
    }

    for filename, lines in outputs.items():
        with open(filename, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines) + '\n')
        print(f"Created {filename}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python whisky_convert.py <document_name>")
        sys.exit(1)

    parse_whisky_file(sys.argv[1])
