"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronRight, Database, Table, Search, Eye, Trash2, RefreshCw, Download, X, ChevronDown, Filter, Lock } from "lucide-react";
import debounce from 'lodash/debounce';
import { Toaster, toast } from 'react-hot-toast';
import { useHotkeys } from 'react-hotkeys-hook';

interface DocumentData {
  _id: string;
  [key: string]: string | number | boolean | object | null;
}

interface CollectionDoc {
  name: string;
  docs: DocumentData[];
}

interface ViewModalData {
  doc: DocumentData;
  collection: string;
}

interface FilterConfig {
  field: string;
  value: string;
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith';
}

const DOCS_PER_PAGE = 10;
const MAX_COLUMNS = 10;
const ADMIN_PASSWORD = "652487";

// Utility to format bytes as KB/MB
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDb, setSelectedDb] = useState<string>("");
  const [collections, setCollections] = useState<CollectionDoc[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [viewModal, setViewModal] = useState<ViewModalData | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterConfig[]>([]);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      setSearchTerm(term);
      setPage(1);
    }, 300),
    []
  );

  // Handle errors
  const handleError = useCallback((error: Error) => {
    setError(error.message);
    toast.error(error.message);
    setLoading(false);
  }, []);

  // Handle success notifications
  const showSuccess = useCallback((message: string) => {
    toast.success(message);
  }, []);

  // Keyboard shortcuts
  useHotkeys('ctrl+f', (e) => {
    e.preventDefault();
    document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
  });

  useHotkeys('esc', () => {
    if (viewModal) setViewModal(null);
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError("");
    } else {
      setPasswordError("Invalid password. Please try again.");
      setPassword("");
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetch("/api/admin/databases")
        .then((res) => res.json())
        .then((data) => setDatabases(data.map((db: { name: string }) => db.name)));
    }
  }, [isAuthenticated]);

  const loadCollections = async (db: string) => {
    setSelectedDb(db);
    setSelectedCollection("");
    setLoading(true);
    setSearchTerm("");
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/collections?db=${db}`);
      if (!response.ok) throw new Error(`Failed to load collections: ${response.statusText}`);
      const data = await response.json();
      setCollections(data);
      showSuccess("Collections loaded successfully");
    } catch (err) {
      handleError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCollection = (col: string) => {
    setSelectedCollection(col);
    setPage(1);
    setSearchTerm("");
    setSortColumn("");
  };

  const deleteDocument = async (collection: string, documentId: string) => {
    try {
      if (!confirm(`Delete document ${documentId}?`)) return;
      
      const response = await fetch(`/api/admin/delete-collection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dbName: selectedDb, collectionName: collection, documentId }),
      });

      if (!response.ok) throw new Error(`Failed to delete document: ${response.statusText}`);
      
      showSuccess("Document deleted successfully");
      await loadCollections(selectedDb);
    } catch (err) {
      handleError(err as Error);
    }
  };

  const downloadDocument = (doc: DocumentData, collection: string) => {
    try {
      const dataStr = JSON.stringify(doc, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${collection}_${doc._id || 'document'}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showSuccess("Document downloaded successfully");
    } catch (err) {
      handleError(err as Error);
    }
  };

  // Add search input handler
  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  // Filter documents based on active filters
  const filterDocuments = (docs: DocumentData[]): DocumentData[] => {
    if (activeFilters.length === 0) return docs;

    return docs.filter(doc =>
      activeFilters.every(filter => {
        const value = doc[filter.field];
        const searchValue = filter.value.toLowerCase();
        
        if (typeof value === 'string') {
          const fieldValue = value.toLowerCase();
          switch (filter.operator) {
            case 'contains':
              return fieldValue.includes(searchValue);
            case 'equals':
              return fieldValue === searchValue;
            case 'startsWith':
              return fieldValue.startsWith(searchValue);
            case 'endsWith':
              return fieldValue.endsWith(searchValue);
            default:
              return true;
          }
        }
        return true;
      })
    );
  };

  const selectedColObj = collections.find((c) => c.name === selectedCollection);
  let docs = selectedColObj?.docs || [];

  // Apply search filter
  if (searchTerm) {
    docs = docs.filter(doc => 
      JSON.stringify(doc).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Apply sorting
  if (sortColumn) {
    docs = [...docs].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDirection === "desc" ? -comparison : comparison;
    });
  }

  const totalPages = Math.ceil(docs.length / DOCS_PER_PAGE);
  const pagedDocs = docs.slice((page - 1) * DOCS_PER_PAGE, page * DOCS_PER_PAGE);

  const columnKeys = pagedDocs.length > 0
    ? Object.keys(pagedDocs[0]).slice(0, MAX_COLUMNS)
    : [];

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(docs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedDb}_${selectedCollection}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Calculate collection size in bytes
  const collectionSizeBytes = docs.reduce((acc, doc) => acc + JSON.stringify(doc).length, 0);

  // Password protection screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/30 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Access Required</h1>
              <p className="text-gray-600">Please enter the admin password to access the database management panel.</p>
            </div>
            
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  placeholder="Enter admin password"
                  required
                />
                {passwordError && (
                  <p className="mt-2 text-sm text-red-600">{passwordError}</p>
                )}
              </div>
              
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium py-3 px-4 rounded-xl transition-all duration-300"
              >
                Access Admin Panel
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Toaster position="top-right" />
      {/* Enhanced Sidebar with Glassmorphism */}
      <div className={`backdrop-blur-xl bg-white/80 border-r border-white/20 transition-all duration-500 ease-in-out ${sidebarCollapsed ? 'w-20' : 'w-96'} flex flex-col relative`}>
        {/* Sidebar Header with Gradient */}
        <div className="p-6 border-b border-white/30 bg-gradient-to-r from-blue-600 to-purple-600 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 backdrop-blur-sm"></div>
          <div className="relative flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Database className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">MongoDB Admin</h1>
                  <p className="text-white/70 text-sm">Database Management</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all duration-300"
            >
              <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${sidebarCollapsed ? '' : 'rotate-180'}`} />
            </button>
          </div>
        </div>

        {/* Databases Section with Enhanced Styling */}
        <div className="flex-1 overflow-y-auto p-4">
          {!sidebarCollapsed && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <Database className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Databases</h2>
              </div>
              <div className="space-y-2">
                {databases.map((db) => (
                  <div key={db} className="group">
                    <button
                      onClick={() => loadCollections(db)}
                      className={`w-full group relative overflow-hidden rounded-xl p-4 transition-all duration-300 ${
                        db === selectedDb 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white scale-105' 
                          : 'bg-white/60 hover:bg-white/80 text-gray-700 hover:scale-102 border border-white/50'
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-purple-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${db === selectedDb ? 'bg-white/20' : 'bg-blue-100'}`}>
                            <Database className={`w-4 h-4 ${db === selectedDb ? 'text-white' : 'text-blue-600'}`} />
                          </div>
                          <span className="font-semibold">{db}</span>
                        </div>
                        {db === selectedDb && (
                          <ChevronDown className="w-5 h-5 animate-pulse" />
                        )}
                      </div>
                    </button>
                    
                    {/* Collections for selected database */}
                    {db === selectedDb && collections.length > 0 && (
                      <div className="ml-4 mt-3 space-y-2 border-l-2 border-gradient-to-b from-blue-400 to-purple-400 pl-4">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                          <Table className="w-3 h-3 mr-1" />
                          Collections
                        </h3>
                        {collections.map((col) => {
                          const colSize = col.docs.reduce((acc, doc) => acc + JSON.stringify(doc).length, 0);
                          return (
                            <button
                              key={col.name}
                              onClick={() => handleSelectCollection(col.name)}
                              className={`w-full group relative overflow-hidden rounded-lg p-3 text-left transition-all duration-300 ${
                                col.name === selectedCollection
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white scale-105'
                                  : 'bg-white/40 hover:bg-white/60 text-gray-700 hover:scale-102 border border-white/40'
                              }`}
                            >
                              <div className="relative flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Table className={`w-3 h-3 ${col.name === selectedCollection ? 'text-white' : 'text-gray-500'}`} />
                                  <span className="font-medium text-sm">{col.name}</span>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  col.name === selectedCollection 
                                    ? 'bg-white/20 text-white' 
                                    : 'bg-gray-200 text-gray-600'
                                }`}>
                                  {col.docs.length} | {formatBytes(colSize)}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {sidebarCollapsed && (
            <div className="space-y-3">
              {databases.map((db) => (
                <button
                  key={db}
                  onClick={() => loadCollections(db)}
                  className={`w-full p-3 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                    db === selectedDb 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' 
                      : 'bg-white/60 hover:bg-white/80 text-gray-600'
                  }`}
                  title={db}
                >
                  <Database className="w-6 h-6 mx-auto" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content with Enhanced Styling */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {error && (
          <div className="bg-red-50 p-4 border-l-4 border-red-500">
            <div className="flex">
              <div className="flex-1">
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Top Navigation Bar with Glassmorphism */}
        <div className="backdrop-blur-xl bg-white/80 border-b border-white/20">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {selectedDb && (
                  <nav className="flex items-center space-x-2 text-sm">
                    <div className="flex items-center space-x-2 px-3 py-2 bg-blue-100 text-blue-800 rounded-lg">
                      <Database className="w-4 h-4" />
                      <span className="font-semibold">{selectedDb}</span>
                    </div>
                    {selectedCollection && (
                      <>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                        <div className="flex items-center space-x-2 px-3 py-2 bg-emerald-100 text-emerald-800 rounded-lg">
                          <Table className="w-4 h-4" />
                          <span className="font-semibold">{selectedCollection}</span>
                        </div>
                      </>
                    )}
                  </nav>
                )}
              </div>
              
              {selectedCollection && (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => loadCollections(selectedDb)}
                    className="flex items-center space-x-2 px-4 py-2 bg-white/80 hover:bg-white text-gray-700 hover:text-gray-900 rounded-lg border border-white/50 transition-all duration-300"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span className="font-medium">Refresh</span>
                  </button>
                  <button
                    onClick={exportData}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg transition-all duration-300"
                  >
                    <Download className="w-4 h-4" />
                    <span className="font-medium">Export Collection</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Area with Enhanced Cards */}
        <div className="flex-1 overflow-y-auto p-8">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" 
                     role="status" 
                     aria-label="Loading">
                </div>
                <span className="text-gray-600 font-medium">Loading collections...</span>
              </div>
            </div>
          )}

          {/* Search and Filter Bar */}
          {selectedCollection && selectedColObj && (
            <div className="backdrop-blur-xl bg-white/80 rounded-2xl border border-white/30 overflow-hidden">
              <div className="border-b border-white/30 p-6 bg-gradient-to-r from-blue-50/50 to-purple-50/50">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      Documents in {selectedCollection}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                        Total: {docs.length} documents
                      </span>
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full font-medium">
                        Size: {formatBytes(collectionSizeBytes)}
                      </span>
                      {searchTerm && (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-medium">
                          Filtered: {docs.length} results
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex-1 relative">
                    <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search documents... (Ctrl+F)"
                      value={searchTerm}
                      onChange={handleSearchInput}
                      className="w-full pl-12 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-white/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      aria-label="Search documents"
                    />
                  </div>
                  
                  <button
                    onClick={() => setActiveFilters([])}
                    className={`flex items-center space-x-2 px-4 py-3 bg-white/80 hover:bg-white text-gray-700 border border-white/50 rounded-xl transition-all duration-300 ${
                      activeFilters.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={activeFilters.length === 0}
                    aria-label="Clear filters"
                  >
                    <Filter className="w-4 h-4" />
                    <span className="font-medium">
                      {activeFilters.length ? `${activeFilters.length} Filters` : 'No Filters'}
                    </span>
                  </button>

                  {sortColumn && (
                    <button
                      onClick={() => { setSortColumn(""); setSortDirection("asc"); }}
                      className="flex items-center space-x-2 px-4 py-3 bg-white/80 hover:bg-white text-gray-700 border border-white/50 rounded-xl transition-all duration-300"
                      aria-label="Clear sort"
                    >
                      <X className="w-4 h-4" />
                      <span className="font-medium">Clear Sort</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Enhanced Table */}
              {pagedDocs.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-gray-500 text-lg mb-4">No documents found</div>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-300"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        {columnKeys.map((key) => (
                          <th
                            key={key}
                            className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-all duration-300 group"
                            onClick={() => handleSort(key)}
                          >
                            <div className="flex items-center space-x-2">
                              <span>{key}</span>
                              <div className="flex flex-col space-y-1">
                                <ChevronRight className={`w-3 h-3 transition-all duration-200 ${
                                  sortColumn === key && sortDirection === "asc" 
                                    ? "text-blue-600 -rotate-90" 
                                    : "text-gray-400 group-hover:text-gray-600"
                                }`} />
                                <ChevronRight className={`w-3 h-3 transition-all duration-200 ${
                                  sortColumn === key && sortDirection === "desc" 
                                    ? "text-blue-600 rotate-90" 
                                    : "text-gray-400 group-hover:text-gray-600"
                                }`} />
                              </div>
                            </div>
                          </th>
                        ))}
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Size</th>
                        <th className="px-6 py-4 bg-gray-100 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {pagedDocs.map((doc, index) => (
                        <tr key={doc._id} className={`transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}>
                          {columnKeys.map((key) => (
                            <td key={key} className="px-6 py-4 text-sm text-gray-900">
                              <div className="max-w-xs truncate font-medium" title={String(doc[key])}>
                                {typeof doc[key] === "object" && doc[key] !== null
                                  ? <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">{JSON.stringify(doc[key]).slice(0, 30)}...</span>
                                  : String(doc[key] || <span className="text-gray-400">-</span>)}
                              </div>
                            </td>
                          ))}
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {formatBytes(JSON.stringify(doc).length)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => setViewModal({ doc, collection: selectedCollection })}
                                className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-all duration-300 group"
                                title="View Document"
                              >
                                <Eye className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              </button>
                              <button
                                onClick={() => downloadDocument(doc, selectedCollection)}
                                className="p-2 text-green-600 hover:text-green-700 hover:bg-green-100 rounded-lg transition-all duration-300 group"
                                title="Download Document"
                              >
                                <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              </button>
                              <button
                                onClick={() => deleteDocument(selectedCollection, doc._id)}
                                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-100 rounded-lg transition-all duration-300 group"
                                title="Delete Document"
                              >
                                <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Enhanced Pagination */}
              {totalPages > 1 && (
                <div className="border-t border-white/30 px-6 py-4 bg-gradient-to-r from-gray-50/50 to-gray-100/50 flex items-center justify-between">
                  <div className="text-sm text-gray-600 font-medium">
                    Showing <span className="text-blue-600 font-bold">{(page - 1) * DOCS_PER_PAGE + 1}</span> to{" "}
                    <span className="text-blue-600 font-bold">{Math.min(page * DOCS_PER_PAGE, docs.length)}</span> of{" "}
                    <span className="text-blue-600 font-bold">{docs.length}</span> documents
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all duration-300"
                    >
                      Previous
                    </button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = i + 1;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                              page === pageNum
                                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all duration-300"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Enhanced View Document Modal */}
      {viewModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden border border-white/50">
            <div className="border-b border-white/30 px-8 py-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 id="modal-title" className="text-xl font-bold">Document Details</h3>
                  <p className="text-white/80 text-sm">Collection: {viewModal.collection}</p>
                </div>
                <button
                  onClick={() => setViewModal(null)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all duration-300"
                  aria-label="Close modal"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-8 overflow-y-auto max-h-[70vh]">
              <div className="mb-4 text-sm text-gray-600">
                <span className="font-semibold">Document Size:</span> {formatBytes(JSON.stringify(viewModal.doc).length)}
              </div>
              <pre className="bg-gray-900 text-green-400 p-6 rounded-xl text-sm overflow-x-auto border border-gray-700 font-mono leading-relaxed">
                {JSON.stringify(viewModal.doc, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}