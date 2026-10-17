"use client";
import React, { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Node,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import TableNode from '@/components/database/TableNode';

const nodeTypes = {
  table: TableNode,
};

const getLayoutedElements = (nodes: any[], edges: any[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  const nodeWidth = 260;
  const nodeHeight = 300;
  
  dagreGraph.setGraph({ rankdir: 'LR' });
  
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });
  
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });
  
  dagre.layout(dagreGraph);
  
  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };
  });
  
  return { nodes, edges };
};

export default function SchemaVisualizerPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [dbType, setDbType] = useState<'analytics' | 'existing'>('analytics');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchema = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // The API endpoint would be something like /api/schema/analytics
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/schema/${dbType}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch schema: ${response.statusText}`);
      }
      
      const data = await response.json();
      const tables = data.schema;
      
      const newNodes = tables.map((t: any) => ({
        id: t.name,
        type: 'table',
        position: { x: 0, y: 0 },
        data: {
          label: t.name,
          columns: t.columns,
        },
      }));
      
      const newEdges: any[] = [];
      tables.forEach((t: any) => {
        t.foreign_keys.forEach((fk: any) => {
          newEdges.push({
            id: `e-${t.name}-${fk.referred_table}`,
            source: fk.referred_table,
            target: t.name,
            animated: true,
            style: { stroke: 'var(--primary)', strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 15,
              height: 15,
              color: 'var(--primary)',
            },
          });
        });
      });
      
      const layouted = getLayoutedElements(newNodes, newEdges);
      setNodes([...layouted.nodes]);
      setEdges([...layouted.edges]);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dbType, setNodes, setEdges]);

  useEffect(() => {
    fetchSchema();
  }, [fetchSchema]);

  return (
    <div style={{ height: 'calc(100vh - 60px)', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        padding: '16px 24px', 
        borderBottom: '1px solid var(--bg-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-panel)'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Database Schema Visualizer</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Interactive view of the database tables and their relationships
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <select 
            value={dbType} 
            onChange={(e) => setDbType(e.target.value as any)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--bg-border)',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              outline: 'none'
            }}
          >
            <option value="analytics">Analytics DB (cpa_analytics)</option>
            <option value="existing">Existing DB (cpa_existing)</option>
          </select>
          
          <button 
            onClick={fetchSchema}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>
      
      <div style={{ flex: 1, position: 'relative' }}>
        {error && (
          <div style={{
            position: 'absolute',
            top: '20px', left: '50%', transform: 'translateX(-50%)',
            background: 'var(--error)', color: 'white',
            padding: '12px 24px', borderRadius: '8px',
            zIndex: 10
          }}>
            {error}
          </div>
        )}
        
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
        >
          <Controls />
          <MiniMap 
            nodeColor={(node: any) => 'var(--primary)'} 
            maskColor="rgba(0,0,0,0.2)"
            style={{ background: 'var(--bg-surface)' }}
          />
          <Background color="var(--bg-border)" gap={16} />
        </ReactFlow>
      </div>
    </div>
  );
}
