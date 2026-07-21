import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../api/client';

export default function SiteProjectsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [searchTimer, setSearchTimer] = useState<any>(null);

  const loadProjects = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      let query = supabase
        .from('projects')
        .select('*')
        .eq('project_type', 'service');
      
      if (keyword) {
        query = query.or(`name.ilike.%${keyword}%,client.ilike.%${keyword}%,code.ilike.%${keyword}%`);
      }
      
      const { data, error } = await query.order('code', { ascending: false });
      if (error) throw error;
      
      const projectIds = data?.map(p => p.id) || [];
      if (projectIds.length > 0) {
        const { data: inspections } = await supabase
          .from('service_inspections')
          .select('project_id, inspection_date, conclusion')
          .in('project_id', projectIds)
          .order('inspection_date', { ascending: false });
        
        const latestInspectionMap: Record<string, any> = {};
        inspections?.forEach(ins => {
          if (!latestInspectionMap[ins.project_id]) {
            latestInspectionMap[ins.project_id] = ins;
          }
        });
        
        data?.forEach(p => {
          p.latestInspection = latestInspectionMap[p.id] || null;
        });
      }
      
      setProjects(data || []);
    } catch (error) {
      console.error('加载维保项目失败', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // 首次加载
  useEffect(() => {
    loadProjects(true);
  }, []);

  // 防抖搜索：用户停止输入 1000ms 后才执行搜索（不触发全局 loading）
  useEffect(() => {
    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(() => {
      loadProjects(false);  // ← 不触发 loading 状态
    }, 1000);
    setSearchTimer(timer);
    return () => clearTimeout(timer);
  }, [keyword]);

  // ... 其余代码保持不变
}