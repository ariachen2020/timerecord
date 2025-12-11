import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { formatTime } from '../utils/timeFormat';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      const res = await api.getOverview();
      setData(res.data);
    } catch (error) {
      console.error('載入失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
          {user?.departmentName} - 全員補休總覽
        </h1>
        <p className="text-gray-600 mt-1">總員工數: {data?.totalEmployees || 0} 人</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 即將到期 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="ml-3 text-lg font-semibold text-gray-800">即將到期 (30天內)</h2>
          </div>

          {data?.expiringSoon?.length > 0 ? (
            <div className="space-y-3">
              {data.expiringSoon.map((item) => (
                <div key={item.employeeId} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-800">員工號碼: {item.employeeId}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        時數: {formatTime(item.amount.hours, item.amount.minutes)}
                      </p>
                    </div>
                    {item.earliestExpiryDate && (
                      <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">
                        {item.earliestExpiryDate}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">無即將到期的補休時數</p>
          )}
        </div>

        {/* 已過期 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <div className="bg-red-100 p-3 rounded-lg">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="ml-3 text-lg font-semibold text-gray-800">已過期</h2>
          </div>

          {data?.expired?.length > 0 ? (
            <div className="space-y-3">
              {data.expired.map((item) => (
                <div key={item.employeeId} className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="font-medium text-gray-800">員工號碼: {item.employeeId}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    時數: {formatTime(item.amount.hours, item.amount.minutes)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">無已過期的補休時數</p>
          )}
        </div>
      </div>
    </div>
  );
}
