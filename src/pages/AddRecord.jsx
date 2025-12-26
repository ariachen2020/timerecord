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
    photoUrl: '',
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState('');

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
        photoUrl: '',
        effectiveDate: new Date().toISOString().split('T')[0],
      });
      setPhotoPreview('');
    } catch (err) {
      setError(err?.error || '新增失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // 檢查檔案大小（限制 5MB）
      if (file.size > 5 * 1024 * 1024) {
        setError('照片檔案過大，請選擇小於 5MB 的照片');
        return;
      }

      // 檢查檔案類型
      if (!file.type.startsWith('image/')) {
        setError('請選擇圖片檔案');
        return;
      }

      // 轉換為 Base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result;
        setFormData(prev => ({ ...prev, photoUrl: base64 }));
        setPhotoPreview(base64);
      };
      reader.onerror = () => {
        setError('照片讀取失敗');
      };
      reader.readAsDataURL(file);
    }
  };

  const clearPhoto = () => {
    setFormData(prev => ({ ...prev, photoUrl: '' }));
    setPhotoPreview('');
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

        {/* 上傳照片 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            上傳照片（選填）
          </label>
          <div className="space-y-3">
            {photoPreview ? (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="預覽"
                  className="w-full max-w-md rounded-lg border border-gray-300"
                />
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition"
                >
                  刪除照片
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-blue-600 font-medium">點擊選擇照片</span>
                  <span className="text-gray-500 text-sm mt-1">支援 JPG、PNG 等格式，限制 5MB</span>
                </label>
              </div>
            )}
          </div>
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
