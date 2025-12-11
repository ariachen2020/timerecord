import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { exportToExcel } from '../utils/excelExport';

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleting, setDeleting] = useState(null);

  // 載入員工列表
  const loadEmployees = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getAllEmployees();
      setEmployees(res.data || []);
    } catch (err) {
      setError(err?.error || '載入失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  // 切換選擇員工
  const toggleEmployee = (employeeId) => {
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId);
    } else {
      newSelected.add(employeeId);
    }
    setSelectedEmployees(newSelected);
  };

  // 全選/取消全選
  const toggleSelectAll = () => {
    if (selectedEmployees.size === employees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(employees.map(e => e.employee_id)));
    }
  };

  // 刪除員工
  const handleDelete = async (employeeId) => {
    if (!window.confirm(`確定要刪除員工 ${employeeId} 嗎？\n這將會刪除該員工的所有補休記錄，此操作無法復原！`)) {
      return;
    }

    setDeleting(employeeId);
    setError('');
    setSuccess('');

    try {
      await api.deleteEmployee(employeeId);
      setSuccess(`員工 ${employeeId} 已刪除`);
      loadEmployees();
      setSelectedEmployees(prev => {
        const newSet = new Set(prev);
        newSet.delete(employeeId);
        return newSet;
      });
    } catch (err) {
      setError(err?.error || '刪除失敗');
    } finally {
      setDeleting(null);
    }
  };

  // 批量下載 Excel
  const handleBatchDownload = async () => {
    if (selectedEmployees.size === 0) {
      alert('請先選擇要下載的員工');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const employeesData = [];

      for (const employeeId of selectedEmployees) {
        const res = await api.getEmployee(employeeId);
        employeesData.push({
          employeeId: res.data.employeeId,
          records: res.data.records,
          summary: res.data.summary
        });
      }

      const filename = selectedEmployees.size === 1
        ? `補休記錄_${Array.from(selectedEmployees)[0]}_${new Date().toISOString().split('T')[0]}`
        : `補休記錄_批量下載_${new Date().toISOString().split('T')[0]}`;

      exportToExcel(employeesData, filename);
      setSuccess(`已成功下載 ${selectedEmployees.size} 名員工的記錄`);
    } catch (err) {
      setError(err?.error || '下載失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">員工管理</h1>

      {/* 操作按鈕 */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="text-sm text-gray-600">
            共 {employees.length} 名員工
            {selectedEmployees.size > 0 && ` · 已選擇 ${selectedEmployees.size} 名`}
          </div>
          <div className="flex gap-3">
            <button
              onClick={toggleSelectAll}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
              disabled={loading || employees.length === 0}
            >
              {selectedEmployees.size === employees.length ? '取消全選' : '全選'}
            </button>
            <button
              onClick={handleBatchDownload}
              disabled={selectedEmployees.size === 0 || loading}
              className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              下載選中的 Excel
            </button>
          </div>
        </div>
      </div>

      {/* 訊息顯示 */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* 員工列表 */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading && employees.length === 0 ? (
          <div className="p-8 text-center text-gray-500">載入中...</div>
        ) : employees.length === 0 ? (
          <div className="p-8 text-center text-gray-500">尚無員工資料</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedEmployees.size === employees.length && employees.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    員工號碼
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    部門代碼
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    建立時間
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((employee) => (
                  <tr key={employee.employee_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.has(employee.employee_id)}
                        onChange={() => toggleEmployee(employee.employee_id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {employee.employee_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {employee.department_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(employee.created_at).toLocaleString('zh-TW')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleDelete(employee.employee_id)}
                        disabled={deleting === employee.employee_id}
                        className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                      >
                        {deleting === employee.employee_id ? '刪除中...' : '刪除'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
