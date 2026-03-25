import { useState } from 'react';
import { exportModuleData } from '../utils/backup';
import { logOperation } from '../api/client';

interface ExportButtonProps {
  module: string;
  moduleName: string;
  filter?: Record<string, any>;
  className?: string;
  children?: React.ReactNode;
}

export default function ExportButton({
  module,
  moduleName,
  filter,
  className = '',
  children,
}: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await exportModuleData(module, filter);
      if (result.success) {
        await logOperation('export', module, { filter, count: '已导出' });
      } else {
        alert(result.message);
      }
    } catch (error: any) {
      alert('导出失败：' + error.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className={`bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 ${className}`}
    >
      {exporting ? '导出中...' : (children || '📥 导出数据')}
    </button>
  );
}