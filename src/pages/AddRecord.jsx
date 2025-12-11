import { useState } from 'react';
import { api } from '../api/client';
import { formatTime } from '../utils/timeFormat';

export default function AddRecord() {
  const [formData, setFormData] = useState({
    employeeId: '',
    operationType: '增加',
    hours: 0,
    minutes: 0,
    effectiveDate: new Date().toISOString().split('T')[0],
    reason: '',
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const res = await api.addRecord({
        ...formData,
        hours: parseInt(formData.hours) || 0,
        minutes: parseInt(formData.minutes) || 0,
      });

      setResult(res.data);

      // 重置表單（保留員工號碼）
      setFormData({
        ...formData,
        hours: 0,
        minutes: 0,
        reason: '',
        effectiveDate: new Date().toISOString().split('T')[0],
      });
    } catch (err) {
      setError(err?.error || '新增失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">新增補休記錄</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        {/* 員工號碼 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            員工號碼 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.employeeId}
            onChange={(e) => handleChange('employeeId', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            placeholder="請輸入員工號碼"
            required
            autoFocus
          />
        </div>

        {/* 操作類型 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            操作類型 <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleChange('operationType', '增加')}
              className={`py-3 px-4 rounded-lg font-medium transition ${
                formData.operationType === '增加'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              增加補休
            </button>
            <button
              type="button"
              onClick={() => handleChange('operationType', '減少')}
              className={`py-3 px-4 rounded-lg font-medium transition ${
                formData.operationType === '減少'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              使用補休
            </button>
          </div>
        </div>

        {/* 時數 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              小時 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={formData.hours}
              onChange={(e) => handleChange('hours', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              分鐘
            </label>
            <input
              type="number"
              min="0"
              value={formData.minutes}
              onChange={(e) => handleChange('minutes', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            />
          </div>
        </div>

        {/* 生效日期 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {formData.operationType === '增加' ? '加班日期' : '使用日期'} <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.effectiveDate}
            onChange={(e) => handleChange('effectiveDate', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            required
          />
        </div>

        {/* 登記原因 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            登記原因
          </label>
          <textarea
            value={formData.reason}
            onChange={(e) => handleChange('reason', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows="3"
            placeholder="選填"
          />
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* 成功訊息 */}
        {result && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            <p className="font-medium">✓ {formData.operationType}成功！</p>
            <p className="text-sm mt-1">員工號碼: {result.employee_id}</p>
          </div>
        )}

        {/* 提交按鈕 */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-lg"
        >
          {loading ? '處理中...' : `確認${formData.operationType}`}
        </button>
      </form>
    </div>
  );
}
