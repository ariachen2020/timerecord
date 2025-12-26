import { useState } from 'react';
import { api } from '../api/client';
import { formatTime, getStatusColor, getStatusText } from '../utils/timeFormat';
import { exportToExcel } from '../utils/excelExport';

export default function QueryEmployee() {
  const [employeeId, setEmployeeId] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const handleQuery = async (e) => {
    e.preventDefault();
    setError('');
    setData(null);
    setLoading(true);

    try {
      const res = await api.getEmployee(employeeId.trim());
      setData(res.data);
    } catch (err) {
      setError(err?.error || '查詢失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = () => {
    if (!data) return;

    const employeesData = [{
      employeeId: data.employeeId,
      records: data.records,
      summary: data.summary
    }];

    exportToExcel(employeesData, `補休記錄_${data.employeeId}_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">查詢員工補休記錄</h1>

      {/* 查詢表單 */}
      <form onSubmit={handleQuery} className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex gap-4">
          <input
            type="text"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            placeholder="請輸入員工號碼"
            required
            autoFocus
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 rounded-lg transition disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? '查詢中...' : '查詢'}
          </button>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
      </form>

      {/* 查詢結果 */}
      {data && (
        <>
          {/* 下載按鈕 */}
          <div className="mb-4 flex justify-end">
            <button
              onClick={handleDownloadExcel}
              className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2 rounded-lg transition flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              下載 Excel
            </button>
          </div>

          {/* 統計卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600 mb-1">總累計</p>
              <p className="text-2xl font-bold text-gray-800">
                {formatTime(data.summary.totalAccumulated.hours, data.summary.totalAccumulated.minutes)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600 mb-1">可用餘額</p>
              <p className="text-2xl font-bold text-green-600">
                {formatTime(data.summary.availableBalance.hours, data.summary.availableBalance.minutes)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600 mb-1">即將到期</p>
              <p className="text-2xl font-bold text-yellow-600">
                {formatTime(data.summary.expiringSoon.hours, data.summary.expiringSoon.minutes)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600 mb-1">已過期</p>
              <p className="text-2xl font-bold text-red-600">
                {formatTime(data.summary.expired.hours, data.summary.expired.minutes)}
              </p>
            </div>
          </div>

          {/* 詳細記錄 */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">詳細記錄</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      生效日期
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      時數
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      到期日
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      狀態
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      原因
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      照片
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.records.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.effective_date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          record.operation_type === '增加'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {record.operation_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatTime(record.hours, record.minutes)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.expiry_date || '-'}
                        {record.daysUntilExpiry !== null && record.daysUntilExpiry >= 0 && (
                          <span className="ml-2 text-xs text-gray-400">
                            ({record.daysUntilExpiry}天)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.expiry_date && (
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(record.expiryStatus)}`}>
                            {getStatusText(record.expiryStatus)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {record.reason || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.photo_url ? (
                          <button
                            onClick={() => setSelectedPhoto(record.photo_url)}
                            className="text-blue-600 hover:text-blue-800 underline text-sm"
                          >
                            查看照片
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 照片預覽對話框 */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 text-2xl font-bold"
            >
              ✕ 關閉
            </button>
            <img
              src={selectedPhoto}
              alt="補休記錄照片"
              className="max-w-full max-h-[90vh] rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
