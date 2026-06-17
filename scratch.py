import sys

with open(r'c:\Users\Edelle Lumabi\Documents\exoasia\Exoasia-Matching-Platform\src\app\projects\[id]\page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the start of the block
start_idx = -1
for i, line in enumerate(lines):
    if '{editing ? (' in line and 'onSubmit={handleSave}' in lines[i+1]:
        start_idx = i
        break

# Find the end of the block
end_idx = -1
balance = 0
for i in range(start_idx, len(lines)):
    line = lines[i]
    balance += line.count('{') - line.count('}')
    if balance == 0:
        if '        </div>' in lines[i+1]:
            end_idx = i
            break

if start_idx != -1 and end_idx != -1:
    block = lines[start_idx:end_idx+1]
    
    # Remove block from original position
    del lines[start_idx:end_idx+1]
    
    # Find insertion point at the top of project-panel-details
    insert_idx = -1
    for i, line in enumerate(lines):
        if 'id="project-panel-details"' in line:
            insert_idx = i + 1
            break
            
    if insert_idx != -1:
        block.insert(0, '          <div className="mb-8">\n')
        block.append('          </div>\n')
        
        lines = lines[:insert_idx] + block + lines[insert_idx:]
        
        with open(r'c:\Users\Edelle Lumabi\Documents\exoasia\Exoasia-Matching-Platform\src\app\projects\[id]\page.tsx', 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print('Successfully moved the block!')
    else:
        print('Insertion point not found')
else:
    print('Block not found', start_idx, end_idx)
