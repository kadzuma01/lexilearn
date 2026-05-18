import sqlite3

conn = sqlite3.connect('backend/instance/lexilearn.db')
cursor = conn.cursor()

# Получить все таблицы
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()

for table in tables:
    table_name = table[0]
    print(f"\n{'='*50}")
    print(f"Таблица: {table_name}")
    print('='*50)
    
    # Получить информацию о колонках
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = cursor.fetchall()
    
    print(f"Колонки ({len(columns)}):")
    for col in columns:
        # col: (cid, name, type, notnull, dflt_value, pk)
        print(f"  - {col[1]:<25} {col[2]:<15} PK={col[5]} NOT_NULL={col[3]}")
    
    # Получить количество строк
    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
    count = cursor.fetchone()[0]
    print(f"Количество строк: {count}")

conn.close()