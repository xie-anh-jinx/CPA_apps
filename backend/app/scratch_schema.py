from sqlalchemy import inspect
from app.database import analytics_engine, existing_engine

def get_schema(engine):
    inspector = inspect(engine)
    tables = []
    
    for table_name in inspector.get_table_names():
        columns = []
        try:
            pk_constraint = inspector.get_pk_constraint(table_name)
            pk_columns = pk_constraint.get("constrained_columns", [])
        except:
            pk_columns = []

        for col in inspector.get_columns(table_name):
            columns.append({
                "name": col["name"],
                "type": str(col["type"]),
                "nullable": col["nullable"],
                "primary_key": col["name"] in pk_columns,
            })
            
        foreign_keys = []
        for fk in inspector.get_foreign_keys(table_name):
            foreign_keys.append({
                "constrained_columns": fk["constrained_columns"],
                "referred_table": fk["referred_table"],
                "referred_columns": fk["referred_columns"],
            })
            
        tables.append({
            "name": table_name,
            "columns": columns,
            "foreign_keys": foreign_keys
        })
        
    return tables

if __name__ == "__main__":
    import json
    print("Extracting...")
    # Just checking first table of each to see if it works
    print(json.dumps(get_schema(analytics_engine)[:1], indent=2))
