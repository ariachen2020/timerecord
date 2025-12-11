import * as XLSX from 'xlsx';
import { formatTime } from './timeFormat';

/**
 * 將員工資料導出為 Excel 檔案
 * @param {Array} employeesData - 員工資料陣列，每個元素包含 { employeeId, records, summary }
 * @param {string} filename - 檔案名稱（不含副檔名）
 */
export function exportToExcel(employeesData, filename = '補休時數記錄') {
  // 創建一個新的工作簿
  const workbook = XLSX.utils.book_new();

  employeesData.forEach((employeeData) => {
    const { employeeId, records = [], summary = {} } = employeeData;

    // 準備工作表資料
    const worksheetData = [];

    // 標題行
    worksheetData.push([`員工號碼: ${employeeId}`]);
    worksheetData.push([]);

    // 摘要資訊
    worksheetData.push(['補休時數摘要']);
    worksheetData.push(['累計總時數', formatTime(summary.totalAccumulated?.hours || 0, summary.totalAccumulated?.minutes || 0)]);
    worksheetData.push(['可用餘額', formatTime(summary.availableBalance?.hours || 0, summary.availableBalance?.minutes || 0)]);
    worksheetData.push(['即將到期', formatTime(summary.expiringSoon?.hours || 0, summary.expiringSoon?.minutes || 0)]);
    worksheetData.push(['已過期', formatTime(summary.expired?.hours || 0, summary.expired?.minutes || 0)]);
    worksheetData.push([]);

    // 記錄表格標題
    worksheetData.push(['日期', '操作類型', '時數', '到期日', '到期狀態', '距離到期天數', '登記原因', '操作人員', '建立時間']);

    // 記錄資料
    records.forEach((record) => {
      const expiryStatusMap = {
        'normal': '正常',
        'expiring_soon': '即將到期',
        'expired': '已過期'
      };

      worksheetData.push([
        record.effective_date,
        record.operation_type,
        formatTime(record.hours, record.minutes),
        record.expiry_date || '-',
        record.expiryStatus ? expiryStatusMap[record.expiryStatus] : '-',
        record.daysUntilExpiry !== null ? `${record.daysUntilExpiry} 天` : '-',
        record.reason || '-',
        record.created_by || '-',
        new Date(record.created_at).toLocaleString('zh-TW')
      ]);
    });

    // 創建工作表
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // 設定欄位寬度
    worksheet['!cols'] = [
      { wch: 12 }, // 日期
      { wch: 10 }, // 操作類型
      { wch: 8 },  // 時數
      { wch: 12 }, // 到期日
      { wch: 12 }, // 到期狀態
      { wch: 14 }, // 距離到期天數
      { wch: 20 }, // 登記原因
      { wch: 12 }, // 操作人員
      { wch: 20 }  // 建立時間
    ];

    // 將工作表加入工作簿，工作表名稱為員工號碼
    XLSX.utils.book_append_sheet(workbook, worksheet, `員工_${employeeId}`);
  });

  // 生成 Excel 檔案並下載
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
