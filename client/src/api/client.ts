import { useAuthStore } from '../store/authStore';

// ==================== 模拟模式配置 ====================
const USE_MOCK = true;

// ==================== 真实数据（从你的Excel导入）====================
const mockData = {
  // 项目
  projects: [
    { id: '1', name: '南城正通达', code: 'HX2026001', status: 'ongoing', client: '广物汽贸', contractor: '汇信电力', contractNo: 'hx2025012001', contractAmount: '428000', startDate: '2026-02-01', endDate: '2026-03-11', remark: '' },
    { id: '2', name: '万宏广场', code: 'HX2026002', status: 'ongoing', client: '敏鹰置业', contractor: '汇信电力', contractNo: 'hx2025012001', contractAmount: '1130000', startDate: '2026-02-01', endDate: '', remark: '' },
    { id: '3', name: '万江4号楼', code: 'HX2023001', status: 'suspended', client: '万江金鳌新村物业', contractor: '汇信电力', contractNo: 'hx20250', contractAmount: '1318985.47', startDate: '', endDate: '2024-03-11', remark: '20240311 验收' },
    { id: '4', name: '大朗阳光城', code: 'HX2023002', status: 'completed', client: '江西景龙', contractor: '汇信电力', contractNo: '', contractAmount: '790000', startDate: '', endDate: '', remark: '' },
    { id: '5', name: '道滘阳光城', code: 'HX2023003', status: 'completed', client: '某房地产', contractor: '汇信电力', contractNo: '', contractAmount: '500000', startDate: '', endDate: '', remark: '' },
    { id: '6', name: '上三杞油站', code: 'HX2023004', status: 'completed', client: '油站', contractor: '汇信电力', contractNo: '', contractAmount: '340000', startDate: '', endDate: '', remark: '' },
    { id: '7', name: '厚街电房土建', code: 'HX2023005', status: 'completed', client: '晋悦公司', contractor: '汇信电力', contractNo: '', contractAmount: '1800000', startDate: '', endDate: '', remark: '' },
    { id: '8', name: '万江茶文化', code: 'HX2023006', status: 'suspended', client: '万江实业', contractor: '汇信电力', contractNo: 'hx20250', contractAmount: '437579.41', startDate: '', endDate: '2024-05-24', remark: '2024.5.24 验收' },
    { id: '9', name: '万江5号楼', code: 'HX2025001', status: 'suspended', client: '万江金鳌新村物业', contractor: '汇信电力', contractNo: 'hx20250', contractAmount: '1713551.92', startDate: '', endDate: '2024-06-25', remark: '20240625验收' },
    { id: '10', name: '厚街大众广场', code: 'HX2025002', status: 'completed', client: '晋悦公司', contractor: '汇信电力', contractNo: '', contractAmount: '50000', startDate: '', endDate: '', remark: '' },
    { id: '11', name: '寮步上底电房', code: 'HX2025003', status: 'completed', client: '上底公司', contractor: '汇信电力', contractNo: '', contractAmount: '120000', startDate: '', endDate: '', remark: '' },
    { id: '12', name: '石排崇光生活馆', code: 'HX2025004', status: 'completed', client: '', contractor: '汇信电力', contractNo: '', contractAmount: '320000', startDate: '', endDate: '', remark: '' },
    { id: '13', name: '石排塘尾大厦', code: 'HX2025005', status: 'suspended', client: '中建', contractor: '汇信电力', contractNo: '12345', contractAmount: '1449237.63', startDate: '', endDate: '', remark: '' },
    { id: '14', name: '石排陈梓浩250KVA箱变', code: 'HX2025006', status: 'completed', client: '东莞市宝航智能技术有限公司', contractor: '汇信电力', contractNo: 'HX-GDSP20250616001', contractAmount: '268000', startDate: '', endDate: '2025-09-09', remark: '2025.09.09 送电' },
    { id: '15', name: '万江龙湾公园', code: 'HX2025007', status: 'ongoing', client: '东莞市万江对外经济发展有限公司', contractor: '汇信电力', contractNo: '45465', contractAmount: '440625.20', startDate: '2026-01-18', endDate: '2026-03-19', remark: '实际通电日期：2026.01.16' },
    { id: '16', name: '汇信办公室装修', code: 'HX2026003', status: 'completed', client: '汇信', contractor: '汇信电力', contractNo: '12345', contractAmount: '300000', startDate: '2025-12-01', endDate: '2025-12-17', remark: '立项为了对账' },
    { id: '17', name: '万江小享金鳌产业园高低压设备负荷测试服务', code: 'HX2025008', status: 'ongoing', client: '东莞市万江小享金鳌物业投资有限公司', contractor: '汇信电力', contractNo: '12345', contractAmount: '149606', startDate: '2026-02-02', endDate: '2026-03-03', remark: '2025年就已经完成了。后来补招标' },
    { id: '18', name: '石排智乐堡增容', code: 'HX2025009', status: 'completed', client: '智乐堡公司', contractor: '汇信电力', contractNo: '123456', contractAmount: '460000', startDate: '', endDate: '', remark: '' },
    { id: '19', name: '万江坝头数据标注产业园16楼电缆采购', code: 'HX2026004', status: 'completed', client: '东莞市万智科技有限公司', contractor: '汇信电力', contractNo: 'HX-GDSP20251124001', contractAmount: '199579', startDate: '2025-11-26', endDate: '2025-11-29', remark: '' },
    { id: '20', name: '东莞市众塑塑胶制品有限公司增容1台500kVA', code: 'HX2024010', status: 'completed', client: '东莞市众塑塑胶制品有限公司', contractor: '汇信电力', contractNo: 'HX20240915001', contractAmount: '263000', startDate: '2024-09-15', endDate: '2024-12-24', remark: '' },
    { id: '21', name: '东莞市铭乐五金制品有限公司增容1台 500kVA', code: 'HX2024011', status: 'completed', client: '东莞市铭乐五金制品有限公司', contractor: '汇信电力', contractNo: 'HX20240918001', contractAmount: '266000', startDate: '2024-09-20', endDate: '2025-01-09', remark: '' },
    { id: '22', name: '石排振豪增容1000kVA', code: 'HX2025010', status: 'completed', client: '东莞市石排振豪塑胶电子制品有限公司', contractor: '汇信电力', contractNo: 'hx20250224001', contractAmount: '263000', startDate: '2025-02-24', endDate: '2025-04-27', remark: '' },
    { id: '23', name: '惠州市耀能物业有限公司增容(1250kVA)', code: 'HX2025011', status: 'completed', client: '惠州市耀能物业有限公司', contractor: '汇信电力', contractNo: 'HX-20250825001', contractAmount: '317000', startDate: '2025-12-02', endDate: '', remark: '' },
  ],

  // 供应商
  suppliers: [
    { id: '1', code: 'GYS0001', name: '广东宏业电气有限公司', category: 'equipment', contactPerson: '孔令超', phone: '13800138000', address: '', bank: '建设银行股份有限公司东莞凯晟支行', account: '44050177970800000318', rating: '4.5', remark: '高低压柜' },
    { id: '2', code: 'GYS0001', name: '江苏龙创电气有限公司', category: 'equipment', contactPerson: '龙杰峰', phone: '13900139000', address: '', bank: '邳州农村商业银行股份有限公司华山路支行', account: '3203820541010000100078', rating: '4.8', remark: '变压器' },
    { id: '3', code: 'GYS0002', name: '东莞市中亿电气有限公司', category: 'equipment', contactPerson: '倪', phone: '', address: '', bank: '农村商业银行股份有限公司东城支行', account: '120140190010012750', rating: '4', remark: '母线槽' },
    { id: '4', code: 'GYS0003', name: '东莞市惠信电控设备有限公司', category: 'equipment', contactPerson: '陈惠强', phone: '', address: '', bank: '银行股份有限公司东莞万江支行', account: '714657741479', rating: '4', remark: '高低压柜' },
    { id: '5', code: 'GYS0004', name: '广东奥川电气科技有限公司', category: 'equipment', contactPerson: '不知道', phone: '', address: '', bank: '银行股份有限公司东莞道滘支行', account: '697758110836', rating: '3.5', remark: '高低压柜' },
    { id: '6', code: 'GYS0005', name: '广东广业达电缆有限公司', category: 'equipment', contactPerson: '小王', phone: '', address: '', bank: '银行股份有限公司东莞常平支行', account: '9550880322021011316', rating: '4', remark: '电缆' },
    { id: '7', code: 'GYS0006', name: '广东胜宇电缆实业有限公司', category: 'equipment', contactPerson: '小王', phone: '', address: '', bank: '农村商业银行股份有限公司开创大道支行', account: '05051471000001044', rating: '4', remark: '电缆' },
    { id: '8', code: 'GYS0007', name: '南方一线(广东)科技有限公司', category: 'equipment', contactPerson: '小王', phone: '', address: '', bank: '浦东发展银行股份有限公司广州番禺支行', account: '82170078801900001871', rating: '4', remark: '电缆' },
    { id: '9', code: 'GYS0008', name: '广东日鸿电缆有限公司', category: 'equipment', contactPerson: '何慧', phone: '', address: '', bank: '农业银行股份有限公司四会大沙支行', account: '44650201040000397', rating: '4', remark: '电缆' },
    { id: '10', code: 'GYS0009', name: '东莞市拓逸电气有限公司', category: 'equipment', contactPerson: '黄一开', phone: '', address: '', bank: '建设银行股份有限公司东莞察步支行', account: '44050177770800002451', rating: '4', remark: '辅材' },
    { id: '11', code: 'GYS0010', name: '东莞市岭安广告装饰有限公司', category: 'other', contactPerson: '夏素琴', phone: '', address: '', bank: '农村商业银行大岭山新塘分理处', account: '140140190010015000', rating: '3.5', remark: '安健环' },
    { id: '12', code: 'GYS0011', name: '东莞市均胜电力技术服务有限公司', category: 'installation', contactPerson: '王旭均', phone: '', address: '', bank: '银行股份有限公司东莞北区支行', account: '769910418110688', rating: '4', remark: '电气安装' },
    { id: '13', code: 'GYS0012', name: '东莞市雷风恒建设工程有限公司', category: 'construction', contactPerson: '郑敏芝', phone: '', address: '', bank: '农村商业银行石碣新风分理处', account: '290040190010005723', rating: '4.5', remark: '土建' },
    { id: '14', code: 'GYS0013', name: '东莞市华越电力工程有限公司', category: 'installation', contactPerson: '黄志华', phone: '', address: '', bank: '银行东莞东城支行', account: '395040100100225771', rating: '4', remark: '电气安装' },
    { id: '15', code: 'GYS0014', name: '东莞市石碣汇胜建筑材料销售经营部(个体工商户)', category: 'equipment', contactPerson: '郑敏芝', phone: '', address: '', bank: '农村商业银行石碣新风分理处', account: '290040190010006726', rating: '4', remark: '各种材料' },
    { id: '16', code: 'GYS0015', name: '巨华（广东）电气有限公司', category: 'equipment', contactPerson: '', phone: '', address: '', bank: '农业银行股份有限公司顺德容桂支行', account: '44492001040016000', rating: '4', remark: '电容' },
    { id: '17', code: 'GYS0016', name: '东莞市同智电气科技有限公司', category: 'equipment', contactPerson: '刘', phone: '', address: '', bank: '农村商业银行中心支行营业部', account: '380010190010028132', rating: '4', remark: '高低压柜、变压器' },
    { id: '18', code: 'GYS0017', name: '东莞市民兴电缆有限公司', category: 'equipment', contactPerson: '黄', phone: '', address: '', bank: '银行股份有限公司凤岗支行', account: '590003201002559', rating: '4.5', remark: '电缆、母线槽' },
    { id: '19', code: 'GYS0018', name: '冯先亮', category: 'other', contactPerson: '', phone: '', address: '', bank: '银行东莞石碣支行营业部', account: '6217857000096371966', rating: '3', remark: '石龙城市便捷酒店八楼房租水电' },
    { id: '20', code: 'GYS0019', name: '东莞多能建设有限公司', category: 'construction', contactPerson: '郑敏芝', phone: '', address: '', bank: '农村商业银行股份有限公司石碣新风分理处', account: '1008870000009517', rating: '4', remark: '' },
    { id: '21', code: 'GYS0020', name: '广东国兴电气有限公司', category: 'equipment', contactPerson: '朱明云', phone: '', address: '', bank: '银行东莞茶山支行', account: '44001777608053008291', rating: '4', remark: '高低压柜' },
    { id: '22', code: 'GYS0021', name: '深圳市华诚电力设备有限公司', category: 'equipment', contactPerson: '张其仁', phone: '', address: '', bank: '银行深圳观澜支行', account: '744574489665', rating: '4', remark: '高低压柜' },
    { id: '23', code: 'GYS023', name: '广东奇业电气设备有限公司', category: 'equipment', contactPerson: '饶', phone: '', address: '', bank: '农村商业银行高埗低涌分理处', account: '300080190010001892', rating: '4', remark: '高低压柜' },
  ],

  // 采购
  purchases: [
    { id: '1', purchaseNo: 'HX2026001-GYS0001-001', logisticsStatus: 'arrived', projectId: '1', supplierId: '2', purchaseDate: '2026-02-03', amount: '81000', content: '800kVA变压器', remark: '' },
    { id: '2', purchaseNo: 'HX2026002-GYS0016-001', logisticsStatus: 'ordered', projectId: '2', supplierId: '17', purchaseDate: '2026-03-11', amount: '373000', content: '海虹变压器', remark: '' },
    { id: '3', purchaseNo: 'HX2026002-GYS0017-001', logisticsStatus: 'ordered', projectId: '2', supplierId: '18', purchaseDate: '2026-03-11', amount: '181985.35', content: '高低压电缆', remark: '' },
    { id: '4', purchaseNo: 'HX2026001-GYS0003-001', logisticsStatus: 'arrived', projectId: '1', supplierId: '4', purchaseDate: '2026-02-01', amount: '111052', content: '高压柜', remark: '' },
    { id: '5', purchaseNo: 'HX2026001-GYS0005-001', logisticsStatus: 'arrived', projectId: '1', supplierId: '6', purchaseDate: '2026-03-05', amount: '39572.61', content: '高低压电缆', remark: '' },
    { id: '6', purchaseNo: 'HX2026001-GYS0013-001', logisticsStatus: 'arrived', projectId: '1', supplierId: '14', purchaseDate: '2026-03-10', amount: '12000', content: '电气安装', remark: '' },
    { id: '7', purchaseNo: 'HX2026001-GYS0001-001', logisticsStatus: 'arrived', projectId: '1', supplierId: '1', purchaseDate: '2026-02-05', amount: '72000', content: '低压柜', remark: '' },
    { id: '8', purchaseNo: 'HX2023001-GYS0012-001', logisticsStatus: 'arrived', projectId: '3', supplierId: '13', purchaseDate: '2023-01-01', amount: '46000', content: '土建', remark: '' },
    { id: '9', purchaseNo: 'HX2023002-GYS0012-001', logisticsStatus: 'ordered', projectId: '4', supplierId: '13', purchaseDate: '2023-02-01', amount: '78951', content: '土建', remark: '' },
    { id: '10', purchaseNo: 'HX2023003-GYS0012-001', logisticsStatus: 'ordered', projectId: '5', supplierId: '13', purchaseDate: '2023-03-01', amount: '63000', content: '土建', remark: '' },
    { id: '11', purchaseNo: 'HX2023004-GYS0012-001', logisticsStatus: 'ordered', projectId: '6', supplierId: '13', purchaseDate: '2023-03-01', amount: '35000', content: '土建', remark: '' },
    { id: '12', purchaseNo: 'HX2023005-GYS0012-001', logisticsStatus: 'arrived', projectId: '7', supplierId: '13', purchaseDate: '2023-03-01', amount: '20000', content: '土建', remark: '' },
    { id: '13', purchaseNo: 'HX2023006-GYS0012-001', logisticsStatus: 'arrived', projectId: '8', supplierId: '13', purchaseDate: '2023-03-01', amount: '23197', content: '土建', remark: '' },
    { id: '14', purchaseNo: 'HX2025001-GYS0012-001', logisticsStatus: 'arrived', projectId: '9', supplierId: '13', purchaseDate: '2023-03-01', amount: '125730', content: '土建', remark: '' },
    { id: '15', purchaseNo: 'HX2025002-GYS0012-001', logisticsStatus: 'ordered', projectId: '10', supplierId: '13', purchaseDate: '2023-03-01', amount: '58276', content: '土建', remark: '' },
    { id: '16', purchaseNo: 'HX2025003-GYS0012-001', logisticsStatus: 'arrived', projectId: '11', supplierId: '13', purchaseDate: '2023-03-01', amount: '9000', content: '土建', remark: '' },
    { id: '17', purchaseNo: 'HX2025004-GYS0012-001', logisticsStatus: 'arrived', projectId: '12', supplierId: '13', purchaseDate: '2024-03-01', amount: '19350', content: '土建', remark: '' },
    { id: '18', purchaseNo: 'HX2025005-GYS0012-001', logisticsStatus: 'ordered', projectId: '13', supplierId: '13', purchaseDate: '2024-03-01', amount: '12650', content: '土建', remark: '' },
    { id: '19', purchaseNo: 'HX2026001-GYS0019-001', logisticsStatus: 'ordered', projectId: '1', supplierId: '20', purchaseDate: '2026-02-05', amount: '30000', content: '电房土建', remark: '' },
    { id: '20', purchaseNo: 'HX2025006-GYS0019-001', logisticsStatus: 'arrived', projectId: '14', supplierId: '20', purchaseDate: '2025-08-03', amount: '43000', content: '土建', remark: '' },
    { id: '21', purchaseNo: 'HX2025007-GYS0019-001', logisticsStatus: 'arrived', projectId: '15', supplierId: '20', purchaseDate: '2026-01-09', amount: '73449.22', content: '土建', remark: '' },
    { id: '22', purchaseNo: 'HX2026002-GYS0019-001', logisticsStatus: 'ordered', projectId: '2', supplierId: '20', purchaseDate: '2026-01-22', amount: '105000', content: '土建', remark: '' },
    { id: '23', purchaseNo: 'HX2026003-GYS0019-001', logisticsStatus: 'arrived', projectId: '16', supplierId: '20', purchaseDate: '2025-12-01', amount: '118568', content: '便捷酒店八楼装修', remark: '' },
    { id: '24', purchaseNo: 'HX2025009-GYS0012-001', logisticsStatus: 'arrived', projectId: '18', supplierId: '13', purchaseDate: '2025-05-01', amount: '54418.8', content: '土建', remark: '' },
    { id: '25', purchaseNo: 'HX2026004-GYS0007-001', logisticsStatus: 'arrived', projectId: '19', supplierId: '8', purchaseDate: '2025-11-20', amount: '122904', content: 'WDZC-YJY 4*150+1*70 电缆', remark: '' },
    { id: '26', purchaseNo: 'HX2024010-GYS0001-001', logisticsStatus: 'arrived', projectId: '20', supplierId: '2', purchaseDate: '2024-09-02', amount: '36000', content: '一台500变压器', remark: '' },
    { id: '27', purchaseNo: 'HX2024011-GYS0001-001', logisticsStatus: 'arrived', projectId: '21', supplierId: '2', purchaseDate: '2024-11-10', amount: '82000', content: '一台 500变压器（加强型）', remark: '' },
    { id: '28', purchaseNo: 'HX2025009-GYS0001-001', logisticsStatus: 'arrived', projectId: '18', supplierId: '2', purchaseDate: '2025-04-23', amount: '61000', content: '变压器', remark: '' },
    { id: '29', purchaseNo: 'HX2025010-GYS0001-001', logisticsStatus: 'arrived', projectId: '22', supplierId: '2', purchaseDate: '2025-01-01', amount: '86500', content: '变压器', remark: '' },
    { id: '30', purchaseNo: 'HX2025006-GYS0001-001', logisticsStatus: 'arrived', projectId: '14', supplierId: '2', purchaseDate: '2025-04-11', amount: '23000', content: '变压器', remark: '' },
    { id: '31', purchaseNo: 'HX2024011-GYS0020-001', logisticsStatus: 'arrived', projectId: '21', supplierId: '21', purchaseDate: '2024-09-26', amount: '69000', content: '高低压柜', remark: '' },
    { id: '32', purchaseNo: 'HX2026001-GYS0010-001', logisticsStatus: 'arrived', projectId: '1', supplierId: '11', purchaseDate: '2026-03-01', amount: '1500', content: '安健环', remark: '' },
    { id: '33', purchaseNo: 'HX2025011-GYS0021-001', logisticsStatus: 'arrived', projectId: '23', supplierId: '22', purchaseDate: '2025-12-09', amount: '140000', content: '高压柜', remark: '' },
    { id: '34', purchaseNo: 'HX2025005-GYS023-001', logisticsStatus: 'arrived', projectId: '13', supplierId: '23', purchaseDate: '2024-08-27', amount: '320000', content: '低压柜', remark: '' },
    { id: '35', purchaseNo: 'HX2024011-GYS0012-001', logisticsStatus: 'arrived', projectId: '21', supplierId: '13', purchaseDate: '2024-11-14', amount: '5504.5', content: '电房零星土建', remark: '' },
  ],

  // 收付款（从Excel导入）
  transactions: [
    { id: '1', date: '2026-03-20', type: 'payment', amount: '-42904', paymentMethod: 'bank', projectId: '19', supplierId: '8', purchaseId: '25', remark: '农商自有。采购内容：WDZC-YJY 4*150+1*70 电缆' },
    { id: '2', date: '2026-03-20', type: 'receipt', amount: '21400', paymentMethod: 'bank', projectId: '1', supplierId: '', purchaseId: '', remark: '农商行。来自：捷达通贸易' },
    { id: '3', date: '2026-03-20', type: 'payment', amount: '-78951', paymentMethod: 'bank', projectId: '4', supplierId: '13', purchaseId: '9', remark: '与对方财务核对后销账' },
    { id: '4', date: '2026-03-19', type: 'receipt', amount: '21400', paymentMethod: 'bank', projectId: '1', supplierId: '', purchaseId: '', remark: '农商行。来自：渝州长安汽车' },
    { id: '5', date: '2026-03-18', type: 'receipt', amount: '21400', paymentMethod: 'bank', projectId: '1', supplierId: '', purchaseId: '', remark: '农商。来自：广物正通达' },
    { id: '6', date: '2026-03-16', type: 'payment', amount: '-45035', paymentMethod: 'bank', projectId: '2', supplierId: '18', purchaseId: '3', remark: '农商自有。付款申请：高低压电缆' },
    { id: '7', date: '2026-03-06', type: 'payment', amount: '-74600', paymentMethod: 'bank', projectId: '2', supplierId: '17', purchaseId: '2', remark: '农商自有。付款申请：海虹变压器' },
    { id: '8', date: '2026-03-03', type: 'receipt', amount: '395500', paymentMethod: 'bank', projectId: '2', supplierId: '', purchaseId: '', remark: '到农商行。预付款35%' },
    { id: '9', date: '2026-02-10', type: 'receipt', amount: '199579', paymentMethod: 'bank', projectId: '19', supplierId: '', purchaseId: '', remark: '已收齐，无质保金' },
    { id: '10', date: '2026-01-22', type: 'receipt', amount: '317000', paymentMethod: 'bank', projectId: '23', supplierId: '', purchaseId: '', remark: '' },
    { id: '11', date: '2025-12-20', type: 'receipt', amount: '300000', paymentMethod: 'bank', projectId: '16', supplierId: '', purchaseId: '', remark: '对冲销账' },
    { id: '12', date: '2025-10-13', type: 'payment', amount: '-30000', paymentMethod: 'bank', projectId: '23', supplierId: '22', purchaseId: '33', remark: '' },
    { id: '13', date: '2025-10-09', type: 'payment', amount: '-33000', paymentMethod: 'bank', projectId: '14', supplierId: '20', purchaseId: '20', remark: '东莞银行' },
    { id: '14', date: '2025-10-09', type: 'receipt', amount: '268000', paymentMethod: 'bank', projectId: '14', supplierId: '', purchaseId: '', remark: '' },
    { id: '15', date: '2025-08-20', type: 'receipt', amount: '1279415.9', paymentMethod: 'bank', projectId: '3', supplierId: '', purchaseId: '', remark: '石龙二建代收款' },
    { id: '16', date: '2025-06-03', type: 'receipt', amount: '1662145.36', paymentMethod: 'bank', projectId: '9', supplierId: '', purchaseId: '', remark: '粤发收款' },
    { id: '17', date: '2025-06-03', type: 'receipt', amount: '1800000', paymentMethod: 'bank', projectId: '7', supplierId: '', purchaseId: '', remark: '' },
    { id: '18', date: '2025-06-03', type: 'receipt', amount: '50000', paymentMethod: 'bank', projectId: '10', supplierId: '', purchaseId: '', remark: '' },
    { id: '19', date: '2025-06-03', type: 'receipt', amount: '120000', paymentMethod: 'bank', projectId: '11', supplierId: '', purchaseId: '', remark: '' },
    { id: '20', date: '2025-06-03', type: 'receipt', amount: '320000', paymentMethod: 'bank', projectId: '12', supplierId: '', purchaseId: '', remark: '' },
    { id: '21', date: '2025-06-03', type: 'receipt', amount: '460000', paymentMethod: 'bank', projectId: '18', supplierId: '', purchaseId: '', remark: '已收齐，销账' },
    { id: '22', date: '2025-04-11', type: 'payment', amount: '-50000', paymentMethod: 'bank', projectId: '13', supplierId: '23', purchaseId: '34', remark: '农商行贷款' },
    { id: '23', date: '2025-04-08', type: 'receipt', amount: '40000', paymentMethod: 'bank', projectId: '13', supplierId: '', purchaseId: '', remark: '博大 支付' },
    { id: '24', date: '2025-02-10', type: 'receipt', amount: '70000', paymentMethod: 'cash', projectId: '13', supplierId: '', purchaseId: '', remark: '通过发工资支付' },
    { id: '25', date: '2025-01-16', type: 'payment', amount: '-100000', paymentMethod: 'bank', projectId: '13', supplierId: '23', purchaseId: '34', remark: '' },
    { id: '26', date: '2025-01-15', type: 'receipt', amount: '424452.02', paymentMethod: 'bank', projectId: '8', supplierId: '', purchaseId: '', remark: '汇信收款' },
    { id: '27', date: '2025-01-09', type: 'receipt', amount: '900000', paymentMethod: 'bank', projectId: '13', supplierId: '', purchaseId: '', remark: '博大 支付的' },
    { id: '28', date: '2025-01-01', type: 'receipt', amount: '790000', paymentMethod: 'bank', projectId: '4', supplierId: '', purchaseId: '', remark: '' },
    { id: '29', date: '2025-01-01', type: 'receipt', amount: '500000', paymentMethod: 'bank', projectId: '5', supplierId: '', purchaseId: '', remark: '' },
    { id: '30', date: '2025-01-01', type: 'receipt', amount: '340000', paymentMethod: 'bank', projectId: '6', supplierId: '', purchaseId: '', remark: '' },
    { id: '31', date: '2024-09-27', type: 'payment', amount: '-96000', paymentMethod: 'bank', projectId: '13', supplierId: '23', purchaseId: '34', remark: '' },
    { id: '32', date: '2024-08-25', type: 'payment', amount: '-46000', paymentMethod: 'bank', projectId: '3', supplierId: '13', purchaseId: '8', remark: '通过石龙二建支付' },
    { id: '33', date: '2024-08-25', type: 'payment', amount: '-63000', paymentMethod: 'bank', projectId: '5', supplierId: '13', purchaseId: '10', remark: '其中58650由深圳华建电力代付（设计公司），剩余由石龙二建代付' },
    { id: '34', date: '2024-08-25', type: 'payment', amount: '-35000', paymentMethod: 'bank', projectId: '6', supplierId: '13', purchaseId: '11', remark: '其中31786.37由深圳华建电力代付，剩余由石龙二建代付' },
    { id: '35', date: '2024-08-25', type: 'payment', amount: '-20000', paymentMethod: 'bank', projectId: '7', supplierId: '13', purchaseId: '12', remark: '石龙二建代付' },
    { id: '36', date: '2024-08-25', type: 'payment', amount: '-23197', paymentMethod: 'bank', projectId: '8', supplierId: '13', purchaseId: '13', remark: '石龙二建代付 实际工程造价应该就是23197' },
  ],

  // 发票
  invoices: [
    { id: '1', type: 'input', invoiceNo: '2344200000086282561', amount: '46000', taxAmount: '4140', totalAmount: '50140', invoiceDate: '2023-06-05', supplierId: '13', projectId: '3', purchaseId: '8', status: 'unpaid', remark: '' },
    { id: '2', type: 'input', invoiceNo: '2344200000341914792', amount: '78951', taxAmount: '7105.59', totalAmount: '86056.59', invoiceDate: '2023-12-22', supplierId: '13', projectId: '4', purchaseId: '9', status: 'unpaid', remark: '' },
    { id: '3', type: 'input', invoiceNo: '23442000000118911373', amount: '180000', taxAmount: '16200', totalAmount: '196200', invoiceDate: '2023-07-06', supplierId: '13', projectId: '5', purchaseId: '10', status: 'unpaid', remark: '' },
    { id: '4', type: 'input', invoiceNo: '23442000000341910496', amount: '20000', taxAmount: '1800', totalAmount: '21800', invoiceDate: '2023-12-22', supplierId: '13', projectId: '7', purchaseId: '12', status: 'unpaid', remark: '' },
    { id: '5', type: 'input', invoiceNo: '23442000000341896521', amount: '35000', taxAmount: '3150', totalAmount: '38150', invoiceDate: '2023-12-22', supplierId: '13', projectId: '6', purchaseId: '11', status: 'unpaid', remark: '' },
    { id: '6', type: 'input', invoiceNo: '23442000000341889467', amount: '63000', taxAmount: '5670', totalAmount: '68670', invoiceDate: '2023-12-22', supplierId: '13', projectId: '5', purchaseId: '10', status: 'unpaid', remark: '' },
  ],
};

// 模拟用户
const mockUser = {
  id: '1',
  email: 'admin@example.com',
  name: '管理员',
  role: 'admin' as const,
  avatar: '',
};

// API 基础地址
const API_BASE = '/api';

// ==================== API 请求函数 ====================
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (USE_MOCK) {
    console.log('[Mock]', options.method || 'GET', endpoint);
    await new Promise(resolve => setTimeout(resolve, 200));

    // 登录
    if (endpoint === '/auth/login') {
      const body = JSON.parse(options.body as string);
      const validUsers: Record<string, { role: string; name: string }> = {
        'admin@example.com': { role: 'admin', name: '管理员' },
        'finance@example.com': { role: 'finance', name: '财务人员' },
        'boss@example.com': { role: 'boss', name: '老板' },
        'viewer@example.com': { role: 'viewer', name: '查看者' },
      };
      if (body.password === 'admin123' || body.password === '123456') {
        const userInfo = validUsers[body.email];
        if (userInfo) {
          return { token: 'mock-token', user: { ...mockUser, email: body.email, name: userInfo.name, role: userInfo.role } } as T;
        }
      }
      throw new Error('用户名或密码错误');
    }

    // 获取当前用户
    if (endpoint === '/auth/profile') {
      return mockUser as T;
    }

    // 仪表盘统计
    if (endpoint === '/dashboard/stats') {
      const totalProjects = mockData.projects.length;
      const ongoingProjects = mockData.projects.filter(p => p.status === 'ongoing');
      const ongoingAmount = ongoingProjects.reduce((sum, p) => sum + parseFloat(p.contractAmount || '0'), 0);
      const unpaidPurchases = mockData.purchases.filter(p => {
        const paid = mockData.transactions.filter(t => t.purchaseId === p.id && t.type === 'payment').reduce((s, t) => s + Math.abs(parseFloat(t.amount)), 0);
        return parseFloat(p.amount) > paid;
      });
      const unpaidAmount = unpaidPurchases.reduce((sum, p) => sum + (parseFloat(p.amount) - mockData.transactions.filter(t => t.purchaseId === p.id && t.type === 'payment').reduce((s, t) => s + Math.abs(parseFloat(t.amount)), 0)), 0);
      const unpaidInvoices = mockData.invoices.filter(i => i.status === 'unpaid');
      const unpaidInvoiceAmount = unpaidInvoices.reduce((sum, i) => sum + parseFloat(i.totalAmount), 0);
      return { totalProjects, ongoingAmount, unpaidAmount, unpaidInvoiceAmount } as T;
    }

    // 项目列表
    if (endpoint === '/projects') {
      const url = new URL(`http://mock${endpoint}`);
      const page = parseInt(url.searchParams.get('page') || '1');
      const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
      const keyword = url.searchParams.get('keyword') || '';
      const status = url.searchParams.get('status');
      
      let filtered = [...mockData.projects];
      if (keyword) filtered = filtered.filter(p => p.name.includes(keyword) || p.code.includes(keyword));
      if (status && status !== 'all') filtered = filtered.filter(p => p.status === status);
      
      const data = filtered.slice((page - 1) * pageSize, page * pageSize);
      return { data, total: filtered.length, page, pageSize } as T;
    }

    // 项目详情
    if (endpoint.match(/^\/projects\/[^/]+$/) && !endpoint.includes('?')) {
      const id = endpoint.split('/')[2];
      const item = mockData.projects.find(p => p.id === id);
      if (!item) throw new Error('项目不存在');
      // 计算已收款、已开票
      const received = mockData.transactions.filter(t => t.projectId === id && t.type === 'receipt').reduce((s, t) => s + parseFloat(t.amount), 0);
      const invoiced = mockData.invoices.filter(i => i.projectId === id).reduce((s, i) => s + parseFloat(i.totalAmount), 0);
      return { ...item, receivedAmount: received, invoicedAmount: invoiced } as T;
    }

    // 供应商列表
    if (endpoint === '/suppliers') {
      const url = new URL(`http://mock${endpoint}`);
      const page = parseInt(url.searchParams.get('page') || '1');
      const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
      const keyword = url.searchParams.get('keyword') || '';
      const category = url.searchParams.get('category');
      
      let filtered = [...mockData.suppliers];
      if (keyword) filtered = filtered.filter(s => s.name.includes(keyword) || s.code.includes(keyword));
      if (category && category !== 'all') filtered = filtered.filter(s => s.category === category);
      
      // 计算统计
      const totalPurchase = filtered.reduce((sum, s) => {
        const purchases = mockData.purchases.filter(p => p.supplierId === s.id);
        return sum + purchases.reduce((ps, p) => ps + parseFloat(p.amount), 0);
      }, 0);
      const totalPaid = filtered.reduce((sum, s) => {
        const payments = mockData.transactions.filter(t => t.supplierId === s.id && t.type === 'payment');
        return sum + payments.reduce((ps, p) => ps + Math.abs(parseFloat(p.amount)), 0);
      }, 0);
      const totalReceived = filtered.reduce((sum, s) => {
        const receipts = mockData.transactions.filter(t => t.supplierId === s.id && t.type === 'receipt');
        return sum + receipts.reduce((rs, r) => rs + parseFloat(r.amount), 0);
      }, 0);
      
      const data = filtered.slice((page - 1) * pageSize, page * pageSize);
      return { data, total: filtered.length, page, pageSize, summary: { totalPurchase, totalPaid, totalReceived } } as T;
    }

    // 采购列表
    if (endpoint === '/purchases') {
      const url = new URL(`http://mock${endpoint}`);
      const page = parseInt(url.searchParams.get('page') || '1');
      const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
      const keyword = url.searchParams.get('keyword') || '';
      const projectId = url.searchParams.get('projectId');
      const supplierId = url.searchParams.get('supplierId');
      const status = url.searchParams.get('status');
      
      let filtered = [...mockData.purchases];
      if (keyword) filtered = filtered.filter(p => p.content.includes(keyword));
      if (projectId && projectId !== 'all') filtered = filtered.filter(p => p.projectId === projectId);
      if (supplierId && supplierId !== 'all') filtered = filtered.filter(p => p.supplierId === supplierId);
      if (status && status !== 'all') filtered = filtered.filter(p => p.logisticsStatus === status);
      
      // 计算付款和收票状态
      const enriched = filtered.map(p => {
        const paid = mockData.transactions.filter(t => t.purchaseId === p.id && t.type === 'payment').reduce((s, t) => s + Math.abs(parseFloat(t.amount)), 0);
        const invoiced = mockData.invoices.filter(i => i.purchaseId === p.id).reduce((s, i) => s + parseFloat(i.totalAmount), 0);
        return { ...p, paidAmount: paid, invoicedAmount: invoiced };
      });
      
      const data = enriched.slice((page - 1) * pageSize, page * pageSize);
      const totalAmount = filtered.reduce((s, p) => s + parseFloat(p.amount), 0);
      const totalInvoiced = filtered.reduce((s, p) => s + mockData.invoices.filter(i => i.purchaseId === p.id).reduce((is, i) => is + parseFloat(i.totalAmount), 0), 0);
      const totalPaid = filtered.reduce((s, p) => s + mockData.transactions.filter(t => t.purchaseId === p.id && t.type === 'payment').reduce((ps, t) => ps + Math.abs(parseFloat(t.amount)), 0), 0);
      const uniqueSuppliers = new Set(filtered.map(p => p.supplierId)).size;
      
      return { data, total: filtered.length, page, pageSize, summary: { totalAmount, totalInvoiced, totalPaid, uniqueSuppliers } } as T;
    }

    // 收付款列表
    if (endpoint === '/transactions') {
      const url = new URL(`http://mock${endpoint}`);
      const page = parseInt(url.searchParams.get('page') || '1');
      const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
      const keyword = url.searchParams.get('keyword') || '';
      const type = url.searchParams.get('type');
      
      let filtered = [...mockData.transactions];
      if (keyword) filtered = filtered.filter(t => t.remark.includes(keyword) || t.id.includes(keyword));
      if (type && type !== 'all') filtered = filtered.filter(t => t.type === type);
      
      const data = filtered.slice((page - 1) * pageSize, page * pageSize);
      const totalReceipt = filtered.filter(t => t.type === 'receipt').reduce((s, t) => s + parseFloat(t.amount), 0);
      const totalPayment = filtered.filter(t => t.type === 'payment').reduce((s, t) => s + Math.abs(parseFloat(t.amount)), 0);
      const unpaidReceipt = totalReceipt - (mockData.transactions.filter(t => t.type === 'receipt').reduce((s, t) => s + parseFloat(t.amount), 0) - totalReceipt);
      const unpaidPayment = totalPayment - (mockData.transactions.filter(t => t.type === 'payment').reduce((s, t) => s + Math.abs(parseFloat(t.amount)), 0) - totalPayment);
      
      return { data, total: filtered.length, page, pageSize, summary: { totalReceipt, totalPayment, unpaidReceipt, unpaidPayment } } as T;
    }

    // 发票列表
    if (endpoint === '/invoices') {
      const url = new URL(`http://mock${endpoint}`);
      const page = parseInt(url.searchParams.get('page') || '1');
      const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
      const keyword = url.searchParams.get('keyword') || '';
      const type = url.searchParams.get('type');
      const projectId = url.searchParams.get('projectId');
      const status = url.searchParams.get('status');
      
      let filtered = [...mockData.invoices];
      if (keyword) filtered = filtered.filter(i => i.invoiceNo.includes(keyword));
      if (type && type !== 'all') filtered = filtered.filter(i => i.type === type);
      if (projectId && projectId !== 'all') filtered = filtered.filter(i => i.projectId === projectId);
      if (status && status !== 'all') filtered = filtered.filter(i => i.status === status);
      
      const data = filtered.slice((page - 1) * pageSize, page * pageSize);
      return { data, total: filtered.length, page, pageSize } as T;
    }

    // 创建项目
    if (endpoint === '/projects' && options.method === 'POST') {
      const body = JSON.parse(options.body as string);
      const newItem = { id: String(Date.now()), ...body, createdAt: new Date().toISOString() };
      mockData.projects.unshift(newItem);
      return newItem as T;
    }

    // 更新项目
    if (endpoint.match(/^\/projects\/[^/]+$/) && options.method === 'PUT') {
      const id = endpoint.split('/')[2];
      const body = JSON.parse(options.body as string);
      const index = mockData.projects.findIndex(p => p.id === id);
      if (index !== -1) {
        mockData.projects[index] = { ...mockData.projects[index], ...body };
        return mockData.projects[index] as T;
      }
      throw new Error('项目不存在');
    }

    // 删除项目
    if (endpoint.match(/^\/projects\/[^/]+$/) && options.method === 'DELETE') {
      const id = endpoint.split('/')[2];
      const index = mockData.projects.findIndex(p => p.id === id);
      if (index !== -1) {
        mockData.projects.splice(index, 1);
        return null as T;
      }
      throw new Error('项目不存在');
    }

    // 导出
    if (endpoint === '/export/feishu') {
      return { mock: true, count: 10, message: '模拟导出成功' } as T;
    }

    // 生成付款申请单
    if (endpoint === '/transactions/generate-payment-request') {
      const body = JSON.parse(options.body as string);
      // 模拟生成 Excel 文件
      return { success: true, message: '付款申请单已生成', data: body } as T;
    }

    return { data: [], total: 0, page: 1, pageSize: 20 } as T;
  }

  // ==================== 真实 API 调用 ====================
  const { token } = useAuthStore.getState();
  const headers: HeadersInit = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const result = await response.json();
  if (!result.success) {
    if (response.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    throw new Error(result.message || '请求失败');
  }
  return result.data;
}

// ==================== API 导出 ====================
export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: (data: any) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    getProfile: () => request('/auth/profile'),
  },
  dashboard: {
    getStats: () => request('/dashboard/stats'),
  },
  projects: {
    list: (params?: any) => request(`/projects?${new URLSearchParams(params).toString()}`),
    get: (id: string) => request(`/projects/${id}`),
    create: (data: any) => request('/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/projects/${id}`, { method: 'DELETE' }),
  },
  suppliers: {
    list: (params?: any) => request(`/suppliers?${new URLSearchParams(params).toString()}`),
    get: (id: string) => request(`/suppliers/${id}`),
    create: (data: any) => request('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/suppliers/${id}`, { method: 'DELETE' }),
  },
  purchases: {
    list: (params?: any) => request(`/purchases?${new URLSearchParams(params).toString()}`),
    get: (id: string) => request(`/purchases/${id}`),
    create: (data: any) => request('/purchases', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/purchases/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/purchases/${id}`, { method: 'DELETE' }),
  },
  transactions: {
    list: (params?: any) => request(`/transactions?${new URLSearchParams(params).toString()}`),
    get: (id: string) => request(`/transactions/${id}`),
    create: (data: any) => request('/transactions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/transactions/${id}`, { method: 'DELETE' }),
    generatePaymentRequest: (data: any) => request('/transactions/generate-payment-request', { method: 'POST', body: JSON.stringify(data) }),
  },
  invoices: {
    list: (params?: any) => request(`/invoices?${new URLSearchParams(params).toString()}`),
    get: (id: string) => request(`/invoices/${id}`),
    create: (data: any) => request('/invoices', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/invoices/${id}`, { method: 'DELETE' }),
  },
  export: {
    toFeishu: (dataType: string) => request('/export/feishu', { method: 'POST', body: JSON.stringify({ dataType }) }),
    exportData: (module: string, params?: any) => request(`/export/${module}?${new URLSearchParams(params).toString()}`),
  },
};