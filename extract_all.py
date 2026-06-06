#!/usr/bin/env python3
# Extract ALL tables from HTML within markdown using only stdlib

from html.parser import HTMLParser
import re

class TableExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_table = False
        self.in_row = False
        self.in_cell = False
        self.current_cell = ""
        self.current_row = []
        self.rows = []
        self.headers = []
        self.in_header = False
        
    def handle_starttag(self, tag, attrs):
        if tag == "table":
            self.in_table = True
        elif tag in ("tr", "thead", "tbody") and self.in_table:
            if tag in ("thead", "tbody"):
                self.in_header = (tag == "thead")
                self.in_row = False
            else:
                self.in_row = True
                self.current_row = []
        elif tag == "td" or tag == "th":
            self.in_cell = True
            self.current_cell = ""
            
    def handle_endtag(self, tag):
        if tag == "table":
            self.in_table = False
        elif tag == "tr" and self.in_row:
            self.in_row = False
            if self.current_row:
                if set(self.headers) == set(self.current_row):
                    self.headers = list(self.current_row)
                else:
                    self.rows.append(self.current_row)
        elif tag == "td" or tag == "th":
            self.in_cell = False
            if self.in_row:
                self.current_row.append(self.current_cell.strip())
                
    def handle_data(self, data):
        if self.in_cell:
            self.current_cell += data

# Read the markdown content
with open('/Users/antonio/Projects/test/output.md', 'r') as f:
    content = f.read()

# Remove page number artifacts like "1|" at line starts
content = re.sub(r'^\s*\d+\|', '', content, flags=re.MULTILINE)

# Extract tables
parser = TableExtractor()
parser.feed(content)

# Write to CSV
with open('/Users/antonio/Projects/test/output_final.csv', 'w') as f:
    # Write headers
    f.write(','.join(parser.headers) + '\n')
    # Write rows
    for row in parser.rows:
        line = ','.join(cell if ',' not in cell else f'"{cell}"' for cell in row)
        f.write(line + '\n')

print(f'✅ Extracted {len(parser.rows)} rows to output_final.csv')