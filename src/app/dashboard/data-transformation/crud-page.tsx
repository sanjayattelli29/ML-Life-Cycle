"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MaterialReactTable } from "material-react-table";
import { MRT_ColumnDef } from "material-react-table";
import Papa from "papaparse";
import { toast } from "react-hot-toast";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Stack,
  MenuItem,
} from "@mui/material";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import SaveIcon from "@mui/icons-material/Save";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import MergeTypeIcon from "@mui/icons-material/MergeType";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";

// Type for a row in the table (CSV row)
type RowData = Record<string, string>;

interface CrudPageProps {
  dataset: {
    id: string;
    url: string;
    transformedName: string;
    originalName: string;
    processingSteps?: string[];
  };
  onBack: () => void;
}

interface UndoRedoState {
  data: RowData[];
  columns: MRT_ColumnDef<RowData>[];
}

const MAX_DISPLAY_ROWS = 100;

export default function CrudPage({ dataset, onBack }: CrudPageProps) {
  const [data, setData] = useState<RowData[]>([]); // Full dataset
  const [displayData, setDisplayData] = useState<RowData[]>([]); // Limited data for display
  const [columns, setColumns] = useState<MRT_ColumnDef<RowData>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unsaved, setUnsaved] = useState(false);
  const [undoStack, setUndoStack] = useState<UndoRedoState[]>([]);
  const [redoStack, setRedoStack] = useState<UndoRedoState[]>([]);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: "row" | "column"; index: number | null }>({ open: false, type: "row", index: null });
  const [mergeDialog, setMergeDialog] = useState<{ open: boolean; col1: string | null; col2: string | null }>({ open: false, col1: null, col2: null });
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editingCell, setEditingCell] = useState<{rowIndex: number, columnId: string, originalValue: string} | null>(null);

  // Load CSV data
  useEffect(() => {
    setLoading(true);
    setError('');
    
    // Use proxy API to avoid CORS issues
    const proxyUrl = `/api/proxy-csv?url=${encodeURIComponent(dataset.url)}`;
    
    console.log('Loading CSV data from:', dataset.url);
    console.log('Using proxy URL:', proxyUrl);
    
    fetch(proxyUrl)
      .then((res) => {
        console.log('Proxy response status:', res.status);
        console.log('Proxy response headers:', Object.fromEntries(res.headers.entries()));
        
        if (!res.ok) {
          // Try to get error details from response
          return res.json().then(errorData => {
            throw new Error(`HTTP ${res.status}: ${errorData.error || res.statusText}`);
          }).catch(() => {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          });
        }
        return res.text();
      })
      .then((csv) => {
        console.log('CSV data length:', csv.length);
        
        const parsed = Papa.parse<RowData>(csv, { 
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim()
        });
        
        if (parsed.errors.length > 0) {
          console.error('CSV parsing errors:', parsed.errors);
          setError(`Failed to parse CSV: ${parsed.errors[0].message}`);
          setLoading(false);
          return;
        }
        
        const allRows = (parsed.data as RowData[]).filter(row => 
          Object.values(row).some(value => value && value.toString().trim() !== '')
        );
        
        console.log('Total parsed rows:', allRows.length);
        console.log('Sample row:', allRows[0]);
        
        // Ensure we have valid data and columns
        if (allRows.length === 0) {
          setError('No valid data found in CSV file');
          setLoading(false);
          return;
        }

        if (!parsed.meta.fields || parsed.meta.fields.length === 0) {
          setError('No columns found in CSV file');
          setLoading(false);
          return;
        }
        
        // Store full dataset
        setData(allRows);
        
        // Store limited data for display
        const limitedRows = allRows.slice(0, MAX_DISPLAY_ROWS);
        setDisplayData(limitedRows);
        
        // Create columns with proper validation
        const validColumns = parsed.meta.fields
          .filter(field => field && field.trim()) // Remove empty/null fields
          .map((field) => ({
            accessorKey: field.trim(),
            header: field.trim(),
            enableEditing: true,
            id: field.trim(), // Explicitly set ID to match accessorKey
          }));
          
        console.log('Generated columns:', validColumns);
        console.log('Total dataset rows:', allRows.length, 'Display rows:', limitedRows.length);
        setColumns(validColumns);
        setLoading(false);
        setUnsaved(false);
        setUndoStack([]);
        setRedoStack([]);
      })
      .catch((error) => {
        console.error('Error loading CSV:', error);
        setError(`Failed to load dataset: ${error.message}`);
        setLoading(false);
      });
  }, [dataset.url]);

  // Undo/Redo helpers
  const pushUndo = useCallback(
    (newData: RowData[], newColumns: MRT_ColumnDef<RowData>[]) => {
      console.log('pushUndo called, current undo stack length:', undoStack.length);
      console.log('Current data length:', data.length, 'New data length:', newData.length);
      console.log('Current columns length:', columns.length, 'New columns length:', newColumns.length);
      
      // Save current state to undo stack
      setUndoStack((stack) => [...stack, { data: [...data], columns: [...columns] }]);
      setRedoStack([]); // Clear redo stack when new action is performed
      
      // Apply new state
      setData(newData);
      setDisplayData(newData.slice(0, MAX_DISPLAY_ROWS));
      setColumns(newColumns);
      setUnsaved(true);
      
      console.log('Undo stack will have length:', undoStack.length + 1);
    },
    [data, columns, undoStack.length]
  );

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      // Hide body scroll when in fullscreen
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isFullscreen]);

  // Debug undo/redo
  const handleUndo = () => {
    console.log('Undo called, stack length:', undoStack.length);
    if (undoStack.length === 0) {
      console.log('No undo actions available');
      return;
    }
    
    const previousState = undoStack[undoStack.length - 1];
    console.log('Undoing to state:', previousState);
    
    // Save current state to redo stack
    setRedoStack((stack) => [...stack, { data: [...data], columns: [...columns] }]);
    
    // Restore previous state
    setData(previousState.data);
    setDisplayData(previousState.data.slice(0, MAX_DISPLAY_ROWS));
    setColumns(previousState.columns);
    
    // Remove the last item from undo stack
    setUndoStack((stack) => stack.slice(0, -1));
    setUnsaved(true);
    
    console.log('Undo completed, remaining undo stack length:', undoStack.length - 1);
  };

  const handleRedo = () => {
    console.log('Redo called, stack length:', redoStack.length);
    if (redoStack.length === 0) {
      console.log('No redo actions available');
      return;
    }
    
    const nextState = redoStack[redoStack.length - 1];
    console.log('Redoing to state:', nextState);
    
    // Save current state to undo stack
    setUndoStack((stack) => [...stack, { data: [...data], columns: [...columns] }]);
    
    // Restore next state
    setData(nextState.data);
    setDisplayData(nextState.data.slice(0, MAX_DISPLAY_ROWS));
    setColumns(nextState.columns);
    
    // Remove the last item from redo stack
    setRedoStack((stack) => stack.slice(0, -1));
    setUnsaved(true);
    
    console.log('Redo completed, remaining redo stack length:', redoStack.length - 1);
  };

  // Cell edit - create undo state when editing begins and ends
  const handleCellEditStart = (displayRowIndex: number, columnId: string, originalValue: string) => {
    // Save the original value when editing starts
    setEditingCell({ rowIndex: displayRowIndex, columnId, originalValue });
  };

  const handleCellEdit = (displayRowIndex: number, columnId: string, value: string) => {
    // Update display data immediately for UI responsiveness
    const newDisplayData = displayData.map((row, i) =>
      i === displayRowIndex ? { ...row, [columnId]: value } : row
    );
    setDisplayData(newDisplayData);
    
    // Also update the corresponding row in the full dataset
    const newData = data.map((row, i) =>
      i === displayRowIndex ? { ...row, [columnId]: value } : row
    );
    setData(newData);
    setUnsaved(true);
  };

  const handleCellEditEnd = (displayRowIndex: number, columnId: string, finalValue: string) => {
    if (!editingCell) return;
    
    // Only create undo state if the value actually changed
    if (editingCell.originalValue !== finalValue) {
      console.log('Cell edit completed:', editingCell.originalValue, '->', finalValue);
      
      // Create a version of data with the original value for undo
      const originalData = data.map((row, i) =>
        i === displayRowIndex ? { ...row, [columnId]: editingCell.originalValue } : row
      );
      
      // Save the original state to undo stack
      setUndoStack((stack) => [...stack, { data: originalData, columns: [...columns] }]);
      setRedoStack([]); // Clear redo stack when new action is performed
      
      console.log('Created undo state for cell edit');
    }
    
    setEditingCell(null);
  };

  // Row/Column delete
  const handleDeleteRow = (rowIndex: number) => {
    console.log('Deleting row at index:', rowIndex);
    console.log('Current data length before delete:', data.length);
    
    const newData = data.filter((_, i) => i !== rowIndex);
    console.log('New data length after delete:', newData.length);
    
    // Call pushUndo to save current state and apply new state
    pushUndo(newData, columns);
    setDeleteDialog({ open: false, type: "row", index: null });
  };
  
  const handleDeleteColumn = (colIndex: number) => {
    console.log('Deleting column at index:', colIndex);
    console.log('Current columns length before delete:', columns.length);
    
    const colKey = columns[colIndex].accessorKey as string;
    const newColumns = columns.filter((_, i) => i !== colIndex);
    const newData = data.map((row) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [colKey]: _removed, ...rest } = row;
      return rest;
    });
    
    console.log('New columns length after delete:', newColumns.length);
    console.log('New data length after column delete:', newData.length);
    
    // Call pushUndo to save current state and apply new state
    pushUndo(newData, newColumns);
    setDeleteDialog({ open: false, type: "column", index: null });
  };

  // Add column
  const handleAddColumn = () => {
    const newColName = prompt("Enter new column name:");
    if (!newColName) return;
    if (columns.some((col) => col.accessorKey === newColName)) {
      toast.error("Column already exists");
      return;
    }
    
    console.log('Adding new column:', newColName);
    const newColumns = [
      ...columns,
      { accessorKey: newColName, header: newColName, enableEditing: true },
    ];
    const newData = data.map((row) => ({ ...row, [newColName]: "" }));
    
    console.log('New columns length:', newColumns.length);
    pushUndo(newData, newColumns);
  };

  // Combine columns
  const handleCombineColumns = () => {
    if (selectedColumns.length !== 2) {
      toast.error("Select exactly two columns to combine");
      return;
    }
    const [col1, col2] = selectedColumns;
    const newColName = prompt(
      `Enter name for combined column (merging ${col1} and ${col2}):`
    );
    if (!newColName) return;
    
    console.log('Combining columns:', col1, col2, 'into:', newColName);
    const newColumns = columns
      .filter((col) => col.accessorKey !== col1 && col.accessorKey !== col2)
      .concat({ accessorKey: newColName, header: newColName, enableEditing: true });
    const newData = data.map((row) => {
      return {
        ...Object.fromEntries(
          Object.entries(row).filter(
            ([key]) => key !== col1 && key !== col2
          )
        ),
        [newColName]: `${row[col1] ?? ""} ${row[col2] ?? ""}`.trim(),
      };
    });
    
    pushUndo(newData, newColumns);
    setSelectedColumns([]);
    setMergeDialog({ open: false, col1: null, col2: null });
  };

  // Save dataset - Simple replacement approach
  const handleSave = async () => {
    if (!data.length) {
      toast.error("No data to save");
      return;
    }

    setLoading(true);
    try {
      // Convert current data back to CSV
      const csvData = Papa.unparse(data);
      
      console.log("Saving transformed dataset...");
      console.log("CSV data length:", csvData.length);
      console.log("Row count:", data.length);
      console.log("Column count:", columns.length);
      
      // Send JSON payload to upload API
      const response = await fetch(`/api/transformed-datasets/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          csvData: csvData,
          originalDatasetName: dataset.originalName,
          transformedName: dataset.transformedName,
          processingSteps: [
            ...(dataset.processingSteps || []),
            "manual_transformation",
            `rows: ${data.length}`,
            `columns: ${columns.length}`
          ],
          replaceExisting: true,
          oldDatasetId: dataset.id
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Upload failed:", errorText);
        throw new Error(`Failed to save dataset: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log("Save successful:", result);
      
      toast.success("Dataset saved successfully!");
      setUnsaved(false);
      setUndoStack([]);
      setRedoStack([]);
      
    } catch (error) {
      console.error("Save error:", error);
      toast.error(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Table columns for Material React Table
  const mrtColumns = columns.map((col, colIdx) => ({
    ...col,
    Cell: ({ cell, row }: { cell: { getValue: () => string }; row: { index: number } }) => (
      <input
        value={cell.getValue() ?? ""}
        onFocus={() => handleCellEditStart(row.index, col.accessorKey as string, cell.getValue() ?? "")}
        onChange={(e) => handleCellEdit(row.index, col.accessorKey as string, e.target.value)}
        onBlur={(e) => handleCellEditEnd(row.index, col.accessorKey as string, e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur(); // Trigger onBlur to end editing
          }
        }}
        className="w-full border-none bg-transparent outline-none p-1 text-sm"
        style={{ minWidth: '100px' }}
      />
    ),
    Header: () => (
      <Box display="flex" alignItems="center" width="100%" minWidth="150px">
        <input
          type="checkbox"
          checked={selectedColumns.includes(col.accessorKey as string)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedColumns((prev) =>
                prev.length < 2 ? [...prev, col.accessorKey as string] : prev
              );
            } else {
              setSelectedColumns((prev) =>
                prev.filter((c) => c !== col.accessorKey)
              );
            }
          }}
          title="Select for combining columns"
          style={{ width: '16px', height: '16px', margin: '0 8px 0 0' }}
        />
        <Typography 
          variant="body2" 
          fontWeight="600" 
          fontSize="14px" 
          noWrap 
          sx={{ 
            color: '#1f2937', // Darker text for better visibility
            lineHeight: 1.2,
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
        >
          {col.header}
        </Typography>
      </Box>
    ),
    // Store the column index for deletion
    meta: {
      columnIndex: colIdx
    }
  }));

  return (
    <>
      <Box p={isFullscreen ? 0 : 2}>
      {/* Hide main content in fullscreen mode */}
      {!isFullscreen && (
        <>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} mb={2}>
        <Button 
          variant="outlined" 
          onClick={onBack} 
          disabled={loading}
          size="small"
          sx={{ 
            minWidth: 'auto', 
            px: 2,
            color: '#1f2937',
            borderColor: '#374151',
            '&:hover': {
              borderColor: '#1f2937',
              backgroundColor: '#f9fafb'
            }
          }}
        >
          ← Back
        </Button>
        <Box flex={1}>
          <Typography 
            variant="h6" 
            component="h1" 
            sx={{ 
              fontWeight: 600, 
              mb: 0.5,
              color: '#111827', // Dark black text
              fontSize: '1.125rem'
            }}
          >
            Transform: {dataset.transformedName}
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              color: '#374151', // Darker secondary text
              fontWeight: 500,
              fontSize: '0.875rem'
            }}
          >
            Original: {dataset.originalName} • {data.length} rows, {columns.length} columns
          </Typography>
        </Box>
        {unsaved && (
          <Box 
            sx={{ 
              bgcolor: 'warning.light', 
              color: 'warning.dark',
              px: 1.5, 
              py: 0.5, 
              borderRadius: 1,
              fontSize: '0.75rem',
              fontWeight: 500
            }}
          >
            Unsaved Changes
          </Box>
        )}
      </Stack>

      {/* Toolbar */}
      <Stack direction="row" alignItems="center" spacing={1} mb={2} flexWrap="wrap">
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={loading || !unsaved}
          size="small"
          sx={{ 
            fontWeight: 500,
            backgroundColor: '#1f2937',
            color: 'white',
            '&:hover': {
              backgroundColor: '#111827'
            },
            '&:disabled': {
              backgroundColor: '#9ca3af',
              color: '#f3f4f6'
            }
          }}
        >
          {loading ? "Saving..." : "Save Dataset"}
        </Button>
        <Button
          variant="outlined"
          startIcon={<UndoIcon />}
          onClick={handleUndo}
          disabled={undoStack.length === 0 || loading}
          size="small"
          sx={{
            color: '#374151',
            borderColor: '#6b7280',
            '&:hover': {
              borderColor: '#374151',
              backgroundColor: '#f9fafb'
            }
          }}
        >
          Undo ({undoStack.length})
        </Button>
        <Button
          variant="outlined"
          startIcon={<RedoIcon />}
          onClick={handleRedo}
          disabled={redoStack.length === 0 || loading}
          size="small"
          sx={{
            color: '#374151',
            borderColor: '#6b7280',
            '&:hover': {
              borderColor: '#374151',
              backgroundColor: '#f9fafb'
            }
          }}
        >
          Redo ({redoStack.length})
        </Button>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAddColumn}
          disabled={loading}
          size="small"
          sx={{
            color: '#374151',
            borderColor: '#6b7280',
            '&:hover': {
              borderColor: '#374151',
              backgroundColor: '#f9fafb'
            }
          }}
        >
          Add Column
        </Button>
        <Button
          variant="outlined"
          startIcon={<MergeTypeIcon />}
          onClick={() => setMergeDialog({ open: true, col1: null, col2: null })}
          disabled={selectedColumns.length !== 2 || loading}
          size="small"
          sx={{
            color: '#374151',
            borderColor: '#6b7280',
            '&:hover': {
              borderColor: '#374151',
              backgroundColor: '#f9fafb'
            }
          }}
        >
          Combine ({selectedColumns.length}/2)
        </Button>
        <Button
          variant="outlined"
          startIcon={isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          onClick={toggleFullscreen}
          disabled={loading}
          size="small"
          sx={{
            color: '#374151',
            borderColor: '#6b7280',
            '&:hover': {
              borderColor: '#374151',
              backgroundColor: '#f9fafb'
            }
          }}
        >
          {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </Button>
      </Stack>

      {/* Data info */}
      {data.length > 0 && (
        <Box mb={1}>
          <Typography variant="caption" color="text.secondary">
            Showing {displayData.length} of {data.length} rows
            {data.length > MAX_DISPLAY_ROWS && " (table limited to first 100 for performance)"}
          </Typography>
        </Box>
      )}

      {error && (
        <Box mb={2} p={2} bgcolor="#fef2f2" border="1px solid #fecaca" borderRadius={1}>
          <Typography color="#dc2626" variant="body2" fontWeight={500} mb={1}>
            Error Loading Dataset
          </Typography>
          <Typography color="#dc2626" variant="caption" mb={1}>
            {error}
          </Typography>
          <Button 
            variant="outlined" 
            size="small" 
            color="error" 
            sx={{ mt: 1, textTransform: 'none' }}
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </Box>
      )}

      {loading && data.length === 0 && !error && (
        <Box display="flex" justifyContent="center" alignItems="center" p={3}>
          <Box textAlign="center">
            <Typography variant="body1" mb={1}>Loading Dataset...</Typography>
            <Typography variant="caption" color="text.secondary">
              Fetching data from cloud storage
            </Typography>
          </Box>
        </Box>
      )}

      {/* Data Display Warning */}
      {data.length > MAX_DISPLAY_ROWS && (
        <Box mb={1} p={1.5} bgcolor="#fef3c7" border="1px solid #f59e0b" borderRadius={1}>
          <Typography variant="caption" color="#92400e" fontWeight={500}>
            ⚠️ Large dataset: Showing first {MAX_DISPLAY_ROWS} of {data.length} rows. All data will be saved.
          </Typography>
        </Box>
      )}
      
      {/* Close main content conditional */}
      </>
      )}

      {/* Only render table when we have valid data and columns */}
      {!loading && !error && data.length > 0 && columns.length > 0 && (
        <>
          {/* Fullscreen header with close button */}
          {isFullscreen && (
            <Box
              sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: '60px',
                backgroundColor: 'white',
                zIndex: 10001,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 20px',
                borderBottom: '1px solid #e0e0e0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827' }}>
                {dataset.transformedName} - Full Screen View
              </Typography>
              <Button
                variant="outlined"
                startIcon={<FullscreenExitIcon />}
                onClick={toggleFullscreen}
                size="small"
                sx={{
                  color: '#374151',
                  borderColor: '#6b7280',
                  '&:hover': {
                    borderColor: '#374151',
                    backgroundColor: '#f9fafb'
                  }
                }}
              >
                Exit Fullscreen
              </Button>
            </Box>
          )}
          
          <MaterialReactTable
          columns={mrtColumns}
          data={displayData}
          enableColumnOrdering
          enableSorting
          enableGlobalFilter
          enableRowActions
          enableColumnResizing
          enableDensityToggle={false}
          enableFullScreenToggle={false}
          enableHiding
          enableColumnActions
          renderColumnActionsMenuItems={({ column, closeMenu, internalColumnMenuItems }) => [
            ...internalColumnMenuItems, // Include all default actions
            <MenuItem
              key="delete-column"
              onClick={() => {
                const columnIndex = (column.columnDef.meta as { columnIndex?: number })?.columnIndex;
                if (columnIndex !== undefined) {
                  setDeleteDialog({ open: true, type: "column", index: columnIndex });
                }
                closeMenu(); // Close the menu
              }}
              sx={{ 
                color: '#dc2626',
                fontSize: '14px',
                py: 1,
                px: 2,
                '&:hover': {
                  backgroundColor: '#fef2f2',
                  color: '#b91c1c'
                }
              }}
            >
              <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} />
              Delete Column
            </MenuItem>
          ]}
          renderRowActions={({ row }) => (
            <Button
              color="error"
              size="small"
              onClick={() => setDeleteDialog({ open: true, type: "row", index: row.index })}
              title="Delete this row"
              sx={{ 
                minWidth: 'auto', 
                p: 0.5,
                '&:hover': { backgroundColor: '#ffebee' }
              }}
            >
              <DeleteIcon fontSize="small" />
            </Button>
          )}
          muiTableBodyRowProps={{ 
            hover: true,
            sx: { 
              '&:hover': { 
                backgroundColor: '#f8f9fa' 
              }
            }
          }}
          muiTableContainerProps={{ 
            sx: { 
              maxHeight: isFullscreen ? 'calc(100vh - 60px)' : 500, 
              minHeight: isFullscreen ? 'calc(100vh - 60px)' : 300,
              border: '1px solid #e0e0e0',
              borderRadius: isFullscreen ? 0 : 1,
              position: isFullscreen ? 'fixed' : 'relative',
              top: isFullscreen ? '60px' : 'auto',
              left: isFullscreen ? '0' : 'auto',
              width: isFullscreen ? '100vw' : 'auto',
              height: isFullscreen ? 'calc(100vh - 60px)' : 'auto',
              zIndex: isFullscreen ? 9999 : 'auto',
              backgroundColor: 'white',
              boxShadow: isFullscreen ? 'none' : 'none',
              padding: isFullscreen ? '0' : '0',
              overflow: 'auto',
              '& .MuiTableCell-root': {
                padding: '6px 12px',
                fontSize: '0.875rem',
                borderRight: '1px solid #f0f0f0',
              },
              '& .MuiTableCell-head': {
                fontWeight: 600,
                backgroundColor: '#f8fafc',
                borderBottom: '2px solid #e2e8f0',
                color: '#1e293b',
                '& *': {
                  color: '#1e293b !important'
                }
              },
              // Ensure all controls are visible in fullscreen
              '& .MuiTablePagination-root': {
                backgroundColor: 'white',
                borderTop: '1px solid #e0e0e0',
                position: 'sticky',
                bottom: 0,
                zIndex: 1000
              },
              '& .MuiToolbar-root': {
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                position: 'sticky',
                top: 0,
                zIndex: 1000
              }
            } 
          }}
          muiTableHeadCellProps={{
            sx: {
              fontWeight: 600,
              backgroundColor: '#f8fafc',
              fontSize: '0.8rem',
              color: '#1e293b',
              borderBottom: '2px solid #e2e8f0',
              '& .MuiTypography-root': {
                color: '#1e293b'
              }
            }
          }}
          enableStickyHeader
          state={{ 
            isLoading: loading,
            showProgressBars: loading 
          }}
          positionActionsColumn="last"
          muiSearchTextFieldProps={{
            placeholder: 'Search data...',
            size: 'small',
            sx: { 
              maxWidth: '250px',
              '& .MuiOutlinedInput-root': {
                fontSize: '0.875rem'
              }
            }
          }}
          muiTopToolbarProps={{
            sx: {
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              '& .MuiToolbar-root': {
                minHeight: '48px',
                padding: '8px 16px'
              }
            }
          }}
          initialState={{
            pagination: { pageSize: 25, pageIndex: 0 },
            density: 'compact'
          }}
        />
        </>
      )}
      
      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, type: "row", index: null })}>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight={600}>
            Confirm {deleteDialog.type === "row" ? "Row" : "Column"} Deletion
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2">
            Are you sure you want to delete this {deleteDialog.type}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button 
            onClick={() => setDeleteDialog({ open: false, type: "row", index: null })}
            size="small"
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            color="error"
            size="small"
            variant="contained"
            onClick={() => {
              if (deleteDialog.type === "row" && deleteDialog.index !== null) handleDeleteRow(deleteDialog.index);
              if (deleteDialog.type === "column" && deleteDialog.index !== null) handleDeleteColumn(deleteDialog.index);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Merge Dialog */}
      <Dialog open={mergeDialog.open} onClose={() => setMergeDialog({ open: false, col1: null, col2: null })}>
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight={600}>
            Combine Columns
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" mb={1}>
            Select exactly two columns using the checkboxes in the table headers, then click Combine.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Currently selected: {selectedColumns.length}/2 columns
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button 
            onClick={() => setMergeDialog({ open: false, col1: null, col2: null })}
            size="small"
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCombineColumns}
            disabled={selectedColumns.length !== 2}
            size="small"
            variant="contained"
          >
            Combine
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </>
  );
} 