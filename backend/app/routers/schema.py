from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import inspect
from app.database import analytics_engine, existing_engine

router = APIRouter()

def _get_schema_for_engine(engine):
    try:
        inspector = inspect(engine)
        tables = []
        
        for table_name in inspector.get_table_names():
            columns = []
            try:
                pk_constraint = inspector.get_pk_constraint(table_name)
                pk_columns = pk_constraint.get("constrained_columns", [])
            except Exception:
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error inspecting database: {str(e)}")

@router.get("/analytics")
def get_analytics_schema():
    """Get the schema of the analytics database."""
    return {"schema": _get_schema_for_engine(analytics_engine)}

@router.get("/existing")
def get_existing_schema():
    """Get the schema of the existing database."""
    return {"schema": _get_schema_for_engine(existing_engine)}
