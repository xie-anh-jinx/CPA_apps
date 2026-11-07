"use client";
import React, { useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X,
  FileSpreadsheet,
} from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchPlaceholder?: string;
  globalFilterColumn?: string;
  isLoading?: boolean;
  onRowClick?: (row: TData) => void;
  actionButton?: React.ReactNode;
}

export default function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "Cari data...",
  globalFilterColumn,
  isLoading = false,
  onRowClick,
  actionButton,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [showColumnFilters, setShowColumnFilters] = useState(false);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--bg-border)",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Table Toolbar: Global Search, Column Filter Toggle, Page Size, Action Button */}
      <div
        style={{
          padding: "1rem 1.25rem",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          borderBottom: "1px solid var(--bg-border)",
          background: "var(--bg-surface)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: "260px" }}>
          {/* Search Input */}
          <div
            style={{
              position: "relative",
              flex: 1,
              maxWidth: "360px",
            }}
          >
            <Search
              size={15}
              style={{
                position: "absolute",
                left: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              type="text"
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder={searchPlaceholder}
              style={{
                width: "100%",
                padding: "0.45rem 2rem 0.45rem 2.25rem",
                borderRadius: "8px",
                border: "1px solid var(--bg-border)",
                background: "var(--bg-base)",
                color: "var(--text-primary)",
                fontSize: "0.825rem",
                outline: "none",
              }}
            />
            {globalFilter && (
              <button
                onClick={() => setGlobalFilter("")}
                style={{
                  position: "absolute",
                  right: "0.5rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Toggle Column Filters */}
          <button
            onClick={() => setShowColumnFilters(!showColumnFilters)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.45rem 0.75rem",
              borderRadius: "8px",
              border: showColumnFilters
                ? "1px solid var(--color-primary)"
                : "1px solid var(--bg-border)",
              background: showColumnFilters
                ? "rgba(13, 153, 255, 0.1)"
                : "var(--bg-base)",
              color: showColumnFilters
                ? "var(--color-primary)"
                : "var(--text-secondary)",
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            <Filter size={14} />
            <span>Filter Kolom</span>
          </button>
        </div>

        {/* Right tools: Page Size & Action Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
            <span>Tampilkan:</span>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              style={{
                padding: "0.35rem 0.6rem",
                borderRadius: "6px",
                border: "1px solid var(--bg-border)",
                background: "var(--bg-base)",
                color: "var(--text-primary)",
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              {[10, 25, 50, 100].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </div>

          {actionButton}
        </div>
      </div>

      {/* Table Container */}
      <div style={{ overflowX: "auto" }}>
        <table className="data-table" style={{ width: "100%", borderCollapse: "separate" }}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <React.Fragment key={headerGroup.id}>
                <tr>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        style={{
                          cursor: canSort ? "pointer" : "default",
                          userSelect: "none",
                          position: "relative",
                          padding: "0.75rem 1rem",
                          background: "var(--bg-surface)",
                          borderBottom: "1px solid var(--bg-border)",
                          color: "var(--text-secondary)",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {canSort && (
                            <span style={{ color: sorted ? "var(--color-primary)" : "var(--text-muted)" }}>
                              {sorted === "asc" ? (
                                <ArrowUp size={13} />
                              ) : sorted === "desc" ? (
                                <ArrowDown size={13} />
                              ) : (
                                <ArrowUpDown size={12} style={{ opacity: 0.5 }} />
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>

                {/* Optional Per-Column Filter Row */}
                {showColumnFilters && (
                  <tr style={{ background: "var(--bg-hover)" }}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={`filter-${header.id}`}
                        style={{
                          padding: "0.35rem 0.5rem",
                          borderBottom: "1px solid var(--bg-border)",
                          background: "var(--bg-surface)",
                        }}
                      >
                        {header.column.getCanFilter() ? (
                          <input
                            type="text"
                            value={(header.column.getFilterValue() ?? "") as string}
                            onChange={(e) =>
                              header.column.setFilterValue(e.target.value)
                            }
                            placeholder="Filter..."
                            style={{
                              width: "100%",
                              padding: "0.25rem 0.45rem",
                              fontSize: "0.72rem",
                              borderRadius: "4px",
                              border: "1px solid var(--bg-border)",
                              background: "var(--bg-base)",
                              color: "var(--text-primary)",
                              outline: "none",
                            }}
                          />
                        ) : null}
                      </th>
                    ))}
                  </tr>
                )}
              </React.Fragment>
            ))}
          </thead>

          <tbody>
            {isLoading ? (
              // Loading Skeleton
              Array.from({ length: 6 }).map((_, rIdx) => (
                <tr key={`skel-${rIdx}`}>
                  {columns.map((_, cIdx) => (
                    <td key={`skel-c-${cIdx}`} style={{ padding: "0.85rem 1rem" }}>
                      <div
                        style={{
                          height: "16px",
                          borderRadius: "4px",
                          background: "linear-gradient(90deg, var(--bg-surface) 25%, var(--bg-hover) 50%, var(--bg-surface) 75%)",
                          backgroundSize: "200% 100%",
                          animation: "shimmer 1.5s infinite",
                          width: `${Math.floor(50 + Math.random() * 40)}%`,
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick && onRowClick(row.original)}
                  style={{
                    cursor: onRowClick ? "pointer" : "default",
                    transition: "background 0.15s ease",
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      style={{
                        padding: "0.75rem 1rem",
                        borderBottom: "1px solid var(--border-table-row)",
                        fontSize: "0.825rem",
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    padding: "3rem 1rem",
                    textAlign: "center",
                    color: "var(--text-muted)",
                    fontSize: "0.875rem",
                  }}
                >
                  Tidak ada data yang cocok dengan kriteria pencarian.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div
        style={{
          padding: "0.85rem 1.25rem",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          borderTop: "1px solid var(--bg-border)",
          background: "var(--bg-surface)",
          fontSize: "0.8rem",
          color: "var(--text-secondary)",
        }}
      >
        <div>
          Menampilkan{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
          </strong>{" "}
          sampai{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}
          </strong>{" "}
          dari{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            {table.getFilteredRowModel().rows.length}
          </strong>{" "}
          total baris
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            style={{
              padding: "0.35rem 0.5rem",
              borderRadius: "6px",
              border: "1px solid var(--bg-border)",
              background: "var(--bg-base)",
              color: "var(--text-primary)",
              cursor: table.getCanPreviousPage() ? "pointer" : "not-allowed",
              opacity: table.getCanPreviousPage() ? 1 : 0.4,
            }}
            title="Halaman Pertama"
          >
            <ChevronsLeft size={14} />
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            style={{
              padding: "0.35rem 0.5rem",
              borderRadius: "6px",
              border: "1px solid var(--bg-border)",
              background: "var(--bg-base)",
              color: "var(--text-primary)",
              cursor: table.getCanPreviousPage() ? "pointer" : "not-allowed",
              opacity: table.getCanPreviousPage() ? 1 : 0.4,
            }}
            title="Halaman Sebelumnya"
          >
            <ChevronLeft size={14} />
          </button>

          <span style={{ margin: "0 0.5rem", fontSize: "0.8rem" }}>
            Halaman{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              {table.getState().pagination.pageIndex + 1}
            </strong>{" "}
            dari{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              {table.getPageCount() || 1}
            </strong>
          </span>

          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            style={{
              padding: "0.35rem 0.5rem",
              borderRadius: "6px",
              border: "1px solid var(--bg-border)",
              background: "var(--bg-base)",
              color: "var(--text-primary)",
              cursor: table.getCanNextPage() ? "pointer" : "not-allowed",
              opacity: table.getCanNextPage() ? 1 : 0.4,
            }}
            title="Halaman Berikutnya"
          >
            <ChevronRight size={14} />
          </button>
          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            style={{
              padding: "0.35rem 0.5rem",
              borderRadius: "6px",
              border: "1px solid var(--bg-border)",
              background: "var(--bg-base)",
              color: "var(--text-primary)",
              cursor: table.getCanNextPage() ? "pointer" : "not-allowed",
              opacity: table.getCanNextPage() ? 1 : 0.4,
            }}
            title="Halaman Terakhir"
          >
            <ChevronsRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
