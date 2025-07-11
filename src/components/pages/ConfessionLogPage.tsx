import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { useSQLiteConfessors } from '../../hooks/useSQLiteConfessors';
import { useSQLiteConfessionLogs } from '../../hooks/useSQLiteConfessionLogs';
import { usePagination } from '../../hooks/usePagination';
import { Icon } from '../ui/Icon';
import { Pagination } from '../ui/Pagination';
import { ConfessionLogModal } from '../modals/ConfessionLogModal';
import { ConfessionLog } from '../../types';

export const ConfessionLogPage: React.FC = () => {
  const { user } = useAppContext();
  const { confessors } = useSQLiteConfessors();
  const { logs, loading, deleteLog } = useSQLiteConfessionLogs();
  const [showModal, setShowModal] = useState(false);
  const [editingLog, setEditingLog] = useState<ConfessionLog | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConfessor, setSelectedConfessor] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'confessor'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [showFilters, setShowFilters] = useState(false);

  const getConfessorNameById = useCallback((id: string) => {
    const found = confessors.find(c => c.id === id);
    return found ? `${found.firstName} ${found.familyName}` : 'غير معروف';
  }, [confessors]);

  // Get all unique tags from logs
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    logs.forEach(log => {
      log.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [logs]);

  // Filter and sort logs
  const filteredAndSortedLogs = useMemo(() => {
    let results = logs.filter(log => {
      const confessorName = getConfessorNameById(log.confessorId).toLowerCase();
      const matchesSearch = searchTerm === '' || 
        confessorName.includes(searchTerm.toLowerCase()) ||
        log.notes?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesConfessor = selectedConfessor === '' || log.confessorId === selectedConfessor;
      
      const logDate = new Date(log.date);
      const matchesDateFrom = dateFrom === '' || logDate >= new Date(dateFrom);
      const matchesDateTo = dateTo === '' || logDate <= new Date(dateTo);
      
      const matchesTags = selectedTags.length === 0 || 
        selectedTags.every(tag => log.tags?.includes(tag));
      
      return matchesSearch && matchesConfessor && matchesDateFrom && matchesDateTo && matchesTags;
    });
    
    // Sort results
    results.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === 'confessor') {
        const nameA = getConfessorNameById(a.confessorId);
        const nameB = getConfessorNameById(b.confessorId);
        comparison = nameA.localeCompare(nameB);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return results;
  }, [logs, searchTerm, selectedConfessor, dateFrom, dateTo, selectedTags, sortBy, sortOrder, getConfessorNameById]);

  // Pagination
  const getDefaultItemsPerPage = () => {
    return viewMode === 'cards' ? 12 : 20;
  };

  const {
    currentPage,
    totalPages,
    itemsPerPage,
    paginatedData: paginatedLogs,
    totalItems,
    goToPage,
    setItemsPerPage
  } = usePagination({
    data: filteredAndSortedLogs,
    initialItemsPerPage: getDefaultItemsPerPage(),
    initialPage: 1
  });

  // تحديث عدد العناصر عند تغيير وضع العرض
  useEffect(() => {
    const newItemsPerPage = getDefaultItemsPerPage();
    if (itemsPerPage !== newItemsPerPage) {
      setItemsPerPage(newItemsPerPage);
    }
  }, [viewMode]);

  const handleAdd = () => {
    setEditingLog(null);
    setModalMode('add');
    setShowModal(true);
  };

  const handleEdit = (log: ConfessionLog) => {
    setEditingLog(log);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleView = (log: ConfessionLog) => {
    setEditingLog(log);
    setModalMode('view');
    setShowModal(true);
  };

  const handleDelete = async (logId: string) => {
    await deleteLog(logId);
    setShowDeleteConfirm(null);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedConfessor('');
    setDateFrom('');
    setDateTo('');
    setSelectedTags([]);
  };

  const handleSort = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder(newSortBy === 'date' ? 'desc' : 'asc');
    }
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleViewModeChange = (newViewMode: 'table' | 'cards') => {
    setViewMode(newViewMode);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const renderCardView = () => (
    <div className="w-full max-w-full overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
        {paginatedLogs.map(log => {
          const confessorName = getConfessorNameById(log.confessorId);
          const logDate = new Date(log.date);
          
          return (
            <div key={log.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-700 card-hover w-full min-w-0 max-w-full">
              {/* Card Header */}
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-4 rounded-t-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon name="log" className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <h4 className="text-white font-bold text-base truncate">
                      {confessorName}
                    </h4>
                    <p className="text-white/80 text-sm truncate">
                      {logDate.toLocaleDateString('ar-EG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-4 min-w-0">
                {/* Tags */}
                {log.tags && log.tags.length > 0 && (
                  <div className="mb-3 min-w-0">
                    <div className="flex flex-wrap gap-1 overflow-hidden">
                      {log.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full truncate max-w-full">
                          {tag}
                        </span>
                      ))}
                      {log.tags.length > 3 && (
                        <span className="text-gray-500 text-xs flex-shrink-0">+{log.tags.length - 3}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="mb-4 min-w-0">
                  {log.notes ? (
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 break-words">
                      {log.notes}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">لا توجد ملاحظات</p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <button 
                    onClick={() => handleView(log)}
                    className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition-colors touch-manipulation"
                    title="عرض"
                  >
                    <Icon name="search" className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleEdit(log)}
                    className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-full transition-colors touch-manipulation"
                    title="تعديل"
                  >
                    <Icon name="edit" className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(log.id!)}
                    className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded-full transition-colors touch-manipulation"
                    title="حذف"
                  >
                    <Icon name="delete" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderTableView = () => (
    <div className="w-full max-w-full overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-full">
          <table className="w-full text-right min-w-[600px]">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="p-3 text-right text-sm min-w-[120px]">
                  <button
                    onClick={() => handleSort('confessor')}
                    className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    المعترف
                    {sortBy === 'confessor' && (
                      <Icon name={sortOrder === 'asc' ? 'arrowLeft' : 'arrowRight'} className="w-4 h-4 transform rotate-90" />
                    )}
                  </button>
                </th>
                <th className="p-3 text-right text-sm min-w-[100px]">
                  <button
                    onClick={() => handleSort('date')}
                    className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    تاريخ الاعتراف
                    {sortBy === 'date' && (
                      <Icon name={sortOrder === 'asc' ? 'arrowLeft' : 'arrowRight'} className="w-4 h-4 transform rotate-90" />
                    )}
                  </button>
                </th>
                <th className="p-3 text-right text-sm hidden sm:table-cell min-w-[120px]">العلامات</th>
                <th className="p-3 text-right text-sm hidden md:table-cell min-w-[150px]">ملاحظات</th>
                <th className="p-3 text-right text-sm min-w-[100px]">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.map(log => (
                <tr key={log.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="p-3 font-semibold text-sm min-w-0">
                    <div className="max-w-[120px] truncate">
                      {getConfessorNameById(log.confessorId)}
                    </div>
                  </td>
                  <td className="p-3 text-sm min-w-0">
                    <div className="max-w-[100px] truncate">
                      {new Date(log.date).toLocaleDateString('ar-EG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  </td>
                  <td className="p-3 hidden sm:table-cell min-w-0">
                    <div className="flex flex-wrap gap-1 max-w-[120px] overflow-hidden">
                      {log.tags?.slice(0, 2).map(tag => (
                        <span key={tag} className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full truncate">
                          {tag}
                        </span>
                      ))}
                      {(log.tags?.length || 0) > 2 && (
                        <span className="text-gray-500 text-xs flex-shrink-0">+{(log.tags?.length || 0) - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 hidden md:table-cell min-w-0">
                    <div className="max-w-[150px] overflow-hidden">
                      {log.notes ? (
                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 break-words">
                          {log.notes}
                        </p>
                      ) : (
                        <span className="text-gray-400 text-sm italic">لا توجد ملاحظات</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 min-w-0">
                    <div className="flex items-center gap-1 justify-center">
                      <button 
                        onClick={() => handleView(log)}
                        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full touch-manipulation"
                        title="عرض"
                      >
                        <Icon name="search" className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleEdit(log)}
                        className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-full touch-manipulation"
                        title="تعديل"
                      >
                        <Icon name="edit" className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setShowDeleteConfirm(log.id!)}
                        className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded-full touch-manipulation"
                        title="حذف"
                      >
                        <Icon name="delete" className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-full overflow-hidden">
      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-md max-w-full overflow-hidden">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6 max-w-full overflow-hidden">
          {/* Title and Main Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 max-w-full">
            <h3 className="text-xl sm:text-2xl font-bold truncate">سجل الاعترافات</h3>
            <button 
              onClick={handleAdd}
              className="flex items-center justify-center gap-2 bg-blue-500 text-white px-4 py-3 sm:py-2 rounded-lg hover:bg-blue-600 transition-colors w-full sm:w-auto text-sm sm:text-base touch-manipulation flex-shrink-0"
            >
              <Icon name="add" className="w-5 h-5" />
              إضافة اعتراف جديد
            </button>
          </div>

          {/* Search and Filters Toggle */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-full overflow-hidden">
            <div className="relative flex-1 min-w-0">
              <input 
                type="text" 
                placeholder="البحث بالاسم أو الملاحظات..." 
                className="w-full p-3 pr-10 rounded-lg border dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base min-w-0"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Icon name="search" className="w-5 h-5 absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-400" />
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm sm:text-base touch-manipulation sm:hidden flex-shrink-0"
            >
              <Icon name="settings" className="w-5 h-5" />
              فلاتر
            </button>
          </div>

          {/* Advanced Filters */}
          <div className={`${showFilters ? 'block' : 'hidden'} sm:block max-w-full overflow-hidden`}>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg max-w-full overflow-hidden">
              <div className="space-y-4 max-w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-full">
                  {/* Confessor Filter */}
                  <select 
                    value={selectedConfessor}
                    onChange={(e) => setSelectedConfessor(e.target.value)}
                    className="w-full p-2 rounded-lg border dark:bg-gray-600 dark:border-gray-500 text-sm min-w-0"
                  >
                    <option value="">جميع المعترفين</option>
                    {confessors.filter(c => !c.isArchived).map(c => (
                      <option key={c.id} value={c.id}>
                        {`${c.firstName} ${c.familyName}`}
                        {c.isDeacon && ' (شماس)'}
                      </option>
                    ))}
                  </select>

                  {/* Date From */}
                  <input 
                    type="date" 
                    placeholder="من تاريخ"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full p-2 rounded-lg border dark:bg-gray-600 dark:border-gray-500 dark:[color-scheme:dark] text-sm min-w-0"
                  />

                  {/* Date To */}
                  <input 
                    type="date" 
                    placeholder="إلى تاريخ"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full p-2 rounded-lg border dark:bg-gray-600 dark:border-gray-500 dark:[color-scheme:dark] text-sm min-w-0"
                  />

                  {/* Sort */}
                  <div className="flex items-center gap-2 min-w-0">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                      className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-600 dark:border-gray-500 text-sm min-w-0"
                    >
                      <option value="date">التاريخ</option>
                      <option value="confessor">المعترف</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="p-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 dark:border-gray-500 touch-manipulation flex-shrink-0"
                      title={sortOrder === 'asc' ? 'ترتيب تنازلي' : 'ترتيب تصاعدي'}
                    >
                      <Icon name={sortOrder === 'asc' ? 'arrowLeft' : 'arrowRight'} className="w-4 h-4 transform rotate-90" />
                    </button>
                  </div>
                </div>

                {/* Tags Filter */}
                {allTags.length > 0 && (
                  <div className="max-w-full overflow-hidden">
                    <label className="block text-sm font-medium mb-2">فلترة بالعلامات:</label>
                    <div className="flex flex-wrap gap-2 max-w-full overflow-hidden">
                      {allTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => handleTagToggle(tag)}
                          className={`px-3 py-1 rounded-full text-sm transition-colors truncate max-w-full ${
                            selectedTags.includes(tag)
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 max-w-full">
                  <button 
                    onClick={clearFilters}
                    className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm touch-manipulation flex-shrink-0"
                  >
                    <Icon name="x" className="w-4 h-4" />
                    مسح الفلاتر
                  </button>

                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-white dark:bg-gray-600 rounded-lg p-1 w-full sm:w-auto flex-shrink-0">
                    <button
                      onClick={() => handleViewModeChange('cards')}
                      className={`flex-1 sm:flex-none p-2 rounded-md transition-colors touch-manipulation ${
                        viewMode === 'cards' 
                          ? 'bg-blue-500 text-white shadow-sm' 
                          : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                      }`}
                      title="عرض البطاقات"
                    >
                      <Icon name="dashboard" className="w-5 h-5 mx-auto" />
                    </button>
                    <button
                      onClick={() => handleViewModeChange('table')}
                      className={`flex-1 sm:flex-none p-2 rounded-md transition-colors touch-manipulation ${
                        viewMode === 'table' 
                          ? 'bg-blue-500 text-white shadow-sm' 
                          : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                      }`}
                      title="عرض الجدول"
                    >
                      <Icon name="reports" className="w-5 h-5 mx-auto" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 max-w-full">
          <div className="bg-blue-50 dark:bg-blue-900 p-3 sm:p-4 rounded-lg min-w-0">
            <p className="text-blue-600 dark:text-blue-300 text-xs sm:text-sm truncate">إجمالي الاعترافات</p>
            <p className="text-lg sm:text-2xl font-bold text-blue-700 dark:text-blue-200">{totalItems}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900 p-3 sm:p-4 rounded-lg min-w-0">
            <p className="text-green-600 dark:text-green-300 text-xs sm:text-sm truncate">هذا الشهر</p>
            <p className="text-lg sm:text-2xl font-bold text-green-700 dark:text-green-200">
              {filteredAndSortedLogs.filter(log => {
                const logDate = new Date(log.date);
                const now = new Date();
                return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
              }).length}
            </p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900 p-3 sm:p-4 rounded-lg min-w-0">
            <p className="text-purple-600 dark:text-purple-300 text-xs sm:text-sm truncate">هذا الأسبوع</p>
            <p className="text-lg sm:text-2xl font-bold text-purple-700 dark:text-purple-200">
              {filteredAndSortedLogs.filter(log => {
                const logDate = new Date(log.date);
                const now = new Date();
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return logDate >= weekAgo;
              }).length}
            </p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900 p-3 sm:p-4 rounded-lg min-w-0">
            <p className="text-orange-600 dark:text-orange-300 text-xs sm:text-sm truncate">معترفين مختلفين</p>
            <p className="text-lg sm:text-2xl font-bold text-orange-700 dark:text-orange-200">
              {new Set(filteredAndSortedLogs.map(log => log.confessorId)).size}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="w-full max-w-full overflow-hidden">
          {totalItems === 0 ? (
            <div className="text-center py-12">
              <Icon name="log" className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg mb-4">لا توجد سجلات اعتراف تطابق البحث</p>
              <button 
                onClick={handleAdd}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors touch-manipulation"
              >
                إضافة أول اعتراف
              </button>
            </div>
          ) : (
            <>
              {viewMode === 'cards' ? renderCardView() : renderTableView()}
              
              {/* Pagination */}
              <div className="mt-6 sm:mt-8 max-w-full overflow-hidden">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onPageChange={goToPage}
                  onItemsPerPageChange={setItemsPerPage}
                  className="border-t pt-6"
                />
              </div>
            </>
          )}
        </div>

        {/* Modals */}
        {showModal && (
          <ConfessionLogModal 
            mode={modalMode}
            log={editingLog}
            confessors={confessors}
            onClose={() => setShowModal(false)}
            userId={user?.uid}
          />
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
              <div className="p-6 text-center">
                <Icon name="delete" className="w-16 h-16 mx-auto text-red-500 mb-4" />
                <h3 className="text-lg font-bold mb-4">تأكيد الحذف</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  هل أنت متأكد من رغبتك في حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء.
                </p>
                <div className="flex justify-center gap-4">
                  <button 
                    onClick={() => setShowDeleteConfirm(null)}
                    className="px-6 py-2 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                  >
                    إلغاء
                  </button>
                  <button 
                    onClick={() => handleDelete(showDeleteConfirm)}
                    className="px-6 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                  >
                    تأكيد الحذف
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};