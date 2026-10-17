import React from 'react';
import { Handle, Position } from '@xyflow/react';

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  primary_key: boolean;
}

interface TableNodeProps {
  data: {
    label: string;
    columns: Column[];
  };
}

export default function TableNode({ data }: TableNodeProps) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--bg-border)',
      borderRadius: '8px',
      minWidth: '250px',
      fontSize: '12px',
      color: 'var(--text-primary)',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      overflow: 'hidden'
    }}>
      <Handle type="target" position={Position.Left} style={{ background: '#555' }} />
      
      <div style={{
        padding: '8px 12px',
        background: 'var(--bg-surface-hover)',
        borderBottom: '1px solid var(--bg-border)',
        fontWeight: 'bold',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>{data.label}</span>
      </div>

      <div style={{ padding: '0' }}>
        {data.columns.map((col, idx) => (
          <div key={idx} style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '6px 12px',
            borderBottom: idx < data.columns.length - 1 ? '1px solid var(--bg-border)' : 'none',
            background: col.primary_key ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ 
                color: col.primary_key ? '#d97706' : 'var(--text-muted)',
                fontSize: '10px',
                width: '12px',
                display: 'inline-block'
              }}>
                {col.primary_key ? '🔑' : '•'}
              </span>
              <span style={{ fontWeight: col.primary_key ? 'bold' : 'normal' }}>
                {col.name}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', color: 'var(--text-muted)' }}>
              <span>{col.type}</span>
              {col.nullable && <span style={{ opacity: 0.5 }}>null</span>}
            </div>
          </div>
        ))}
      </div>

      <Handle type="source" position={Position.Right} style={{ background: '#555' }} />
    </div>
  );
}
