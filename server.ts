import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { ServiceType, OrderStatus, SupportStaff, Order, OrderLog, Appointment, Companion } from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// In-memory Database
let idCounter = 1004;
let appointmentIdCounter = 1006;
const generateOrderId = () => `GD${idCounter++}`;
const generateAppointmentId = () => `AP${appointmentIdCounter++}`;

const initialAppointments: Appointment[] = [
  {
    id: "AP1001",
    hostName: "徐永亮",
    hostPhone: "15989066022",
    visitTime: "2026年05月22日",
    visitorName: "黄城涛",
    idCard: "431003199102072816",
    phone: "15221195697",
    reason: "业务往来",
    companyName: "广州蚁群信息科技有限公司",
    status: "已过期",
    companions: []
  },
  {
    id: "AP1002",
    hostName: "徐永亮",
    hostPhone: "15989066022",
    visitTime: "2026年04月24日",
    visitorName: "黄城涛",
    idCard: "431003199102072816",
    phone: "15221195697",
    reason: "业务往来",
    vehiclePlate: "粤FA08864",
    companyName: "广州蚁群信息科技有限公司",
    carriedItems: "无",
    status: "已完成",
    entryTime: "2026-04-24 09:42:10",
    exitTime: "2026-04-24 15:53:59",
    companions: [
      {
        phone: "18818911584",
        name: "钱帅",
        idCard: "431003198406222815",
        vehiclePlate: ""
      }
    ]
  },
  {
    id: "AP1003",
    hostName: "徐永亮",
    hostPhone: "15989066022",
    visitTime: "2026年04月14日",
    visitorName: "黄城涛",
    idCard: "431003199102072816",
    phone: "15221195697",
    reason: "业务往来",
    companyName: "广州蚁群信息科技有限公司",
    status: "已完成",
    entryTime: "2026-04-14 10:15:22",
    exitTime: "2026-04-14 16:30:10",
    companions: []
  },
  {
    id: "AP1004",
    hostName: "徐永亮",
    hostPhone: "15989066022",
    visitTime: "2026年04月02日",
    visitorName: "黄城涛",
    idCard: "431003199102072816",
    phone: "15221195697",
    reason: "业务往来",
    companyName: "广州蚁群信息科技有限公司",
    status: "已完成",
    entryTime: "2026-04-02 09:00:15",
    exitTime: "2026-04-02 17:15:45",
    companions: []
  },
  {
    id: "AP1005",
    hostName: "徐永亮",
    hostPhone: "15989066022",
    visitTime: "2026年03月26日",
    visitorName: "黄城涛",
    idCard: "431003199102072816",
    phone: "15221195697",
    reason: "业务往来",
    companyName: "广州蚁群信息科技有限公司",
    status: "已过期",
    companions: []
  }
];

let appointments: Appointment[] = JSON.parse(JSON.stringify(initialAppointments));

const initialStaffs: SupportStaff[] = [
  {
    name: "张文元",
    phone: "138-1111-2222",
    specialty: ServiceType.WUYUAN,
    qrCode: "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=150&h=150", 
    currentLoad: 2,
    isAvailable: true
  },
  {
    name: "李材料",
    phone: "139-3333-4444",
    specialty: ServiceType.CL,
    qrCode: "https://images.unsplash.com/photo-1557683311-cbd1912f458c?auto=format&fit=crop&w=150&h=150",
    currentLoad: 1,
    isAvailable: true
  },
  {
    name: "陈认评",
    phone: "136-5555-6666",
    specialty: ServiceType.RZPG,
    qrCode: "https://images.unsplash.com/photo-1557683304-673a23048d34?auto=format&fit=crop&w=150&h=150",
    currentLoad: 3,
    isAvailable: true
  },
  {
    name: "周检测",
    phone: "135-7777-8888",
    specialty: ServiceType.JYJC,
    qrCode: "https://images.unsplash.com/photo-1557683315-cfd36a3f1ed1?auto=format&fit=crop&w=150&h=150",
    currentLoad: 0,
    isAvailable: true
  }
];

let orders: Order[] = [
  {
    id: "GD1001",
    serviceType: ServiceType.WUYUAN,
    productName: "车规级MCU芯片",
    description: "需要对车规级MCU芯片在电子控制单元（ECU）中的应用进行选型以及批量供货咨询，要求契合高频振动与耐温指标。",
    companyName: "华为技术有限公司智能终端部",
    industry: "电子通信",
    contactName: "任专员",
    contactPhone: "13800000001",
    attachments: [],
    source: "Manual" as any, // fallback source
    status: OrderStatus.PROCESSING,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hrs ago
    assignedStaff: initialStaffs[0], // 张文元
    timeoutCount: 0,
    logs: [
      { time: new Date(Date.now() - 3600000 * 2).toISOString(), content: "【手动新建】工单已创建成功。", author: "系统" },
      { time: new Date(Date.now() - 3600000 * 1.95).toISOString(), content: "【自动派单】AI自动匹配，工单已指派给元器件业务专员【张文元】。", author: "AI派单引擎" },
      { time: new Date(Date.now() - 3600000 * 1.8).toISOString(), content: "市场专员【张文元】已在线接单。状态更新为「处理中」。", author: "张文元" },
      { time: new Date(Date.now() - 3600000 * 1.2).toISOString(), content: "沟通记录：已致电客户任专员，客户需要先做一批实验性样品测试，已将车规级方案规格书发至客户邮箱。", author: "张文元" }
    ]
  },
  {
    id: "GD1002",
    serviceType: ServiceType.RZPG,
    productName: "车载雷达检测认证",
    description: "开展ISO26262功能安全资质体系认证及配套检测报告评估。",
    companyName: "腾讯科技（深圳）有限公司汽车云事业部",
    industry: "芯片雷达研发",
    contactName: "马经理",
    contactPhone: "13912345678",
    attachments: [],
    source: "AI智能建单",
    status: OrderStatus.PENDING_ACCEPT,
    createdAt: new Date(Date.now() - 3600000 * 0.5).toISOString(), // 30 mins ago
    assignedStaff: initialStaffs[2], // 陈认评
    timeoutCount: 0,
    logs: [
      { time: new Date(Date.now() - 3600000 * 0.5).toISOString(), content: "【AI智能建单】客户一句话智能对话建单完成。", author: "AI智能助理" },
      { time: new Date(Date.now() - 3600000 * 0.48).toISOString(), content: "【自动派单】匹配认证评估业务，由于李专员负载较轻但专业不对口，已择优指派给认证专员【陈认评】。", author: "AI派单引擎" }
    ]
  },
  {
    id: "GD1003",
    serviceType: ServiceType.JYJC,
    productName: "材料抗疲劳理化测试",
    description: "新能源大巴底盘焊接点结构钢材抗拉力及长期抗疲劳振动理化检测。",
    companyName: "比亚迪股份有限公司乘用车研发院",
    industry: "汽车制造",
    contactName: "王工",
    contactPhone: "13500001111",
    attachments: [],
    source: "AI表单回填",
    status: OrderStatus.COMPLETED,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), // 24 hrs ago
    assignedStaff: initialStaffs[3], // 周检测
    timeoutCount: 0,
    logs: [
      { time: new Date(Date.now() - 3600000 * 24).toISOString(), content: "【AI表单回填】客户提交了回填修改后的咨询表单。", author: "系统" },
      { time: new Date(Date.now() - 3600000 * 23.9).toISOString(), content: "【自动派单】指派给检验检测业务专员【周检测】（当前负载最小：0项）。", author: "AI派单引擎" },
      { time: new Date(Date.now() - 3600000 * 23.5).toISOString(), content: "【周检测】已接单开始跟进。", author: "周检测" },
      { time: new Date(Date.now() - 3600000 * 5).toISOString(), content: "跟进日志：已协助安排实验室机台，并于今天上午出具了初步理化检验报告。客户表示报告格式满足出厂要求，感谢专家协助！", author: "周检测" },
      { time: new Date(Date.now() - 3600000 * 4.9).toISOString(), content: "工单处理成功，交易关闭完结。", author: "系统" }
    ]
  }
];

let staffs = [...initialStaffs];

// Initialize server-side Gemini lazily & safely
let aiClient: GoogleGenAI | null = null;
const getAiClient = (): GoogleGenAI | null => {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY" && key.trim() !== "") {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });
    }
  }
  return aiClient;
};

// --------------------------------------------------------------------------
// Helper: Auto Assignment solver
// --------------------------------------------------------------------------
function dispatchOrder(order: Order): { assignedStaff?: SupportStaff; log: string } {
  if (order.serviceType === ServiceType.PENDING) {
    return {
      assignedStaff: undefined,
      log: "【派单异常】系统检测到该工单服务分类为「待定」，暂无法执行自动契合式流转，直接流转至「经理待分配池」由市场部经理人工指派。"
    };
  }

  // Filter available staff
  const candidates = staffs.filter(s => s.isAvailable);
  if (candidates.length === 0) {
    return {
      assignedStaff: undefined,
      log: "【派单异常】当前系统没有任何在岗的市场顾问专员，工单自动进入「待分配」池，提醒团队有新客户待跟进。"
    };
  }

  // Find matches by specialty
  const specialtyMatches = candidates.filter(s => s.specialty === order.serviceType);

  if (specialtyMatches.length > 0) {
    // Select lowest load first
    specialtyMatches.sort((a, b) => a.currentLoad - b.currentLoad);
    const chosen = specialtyMatches[0];
    chosen.currentLoad += 1;
    return {
      assignedStaff: chosen,
      log: `【自动派单】经AI负载与专项标签深度识别：匹配「${order.serviceType}」最优专员【${chosen.name}】（专项契合、当前负载为：${chosen.currentLoad - 1}件），系统全自动推送。`
    };
  } else {
    // If no expert is available, pick lowest load from other specialties as fallback
    candidates.sort((a, b) => a.currentLoad - b.currentLoad);
    const fallbackChosen = candidates[0];
    fallbackChosen.currentLoad += 1;
    return {
      assignedStaff: fallbackChosen,
      log: `【自动派单】由于专项类别为「${order.serviceType}」的顾问目前全员占线，系统采取在岗负载择优算法：重定向给在岗且负重最小的顾问【${fallbackChosen.name}】（当前负载为：${fallbackChosen.currentLoad - 1}件）跨领域极速承接。`
    };
  }
}

// --------------------------------------------------------------------------
// Rules-Based Simulated NLP Parse Fallback
// --------------------------------------------------------------------------
function simulateLocalExtract(text: string): {
  companyName: string;
  industry: string;
  contactName: string;
  contactPhone: string;
  productName: string;
  description: string;
  serviceType: ServiceType;
} {
  // Regex heuristics
  const phoneMatch = text.match(/1[3-9]\d{9}/);
  const companyMatch = text.match(/([a-zA-Z\u4e00-\u9fa5]{3,15}(?:有限公司|集团|工厂|部|科(?:技|工)))/) || text.match(/[公司|集团]/);
  
  // Categorization
  let serviceType = ServiceType.PENDING;
  const chipKeywords = ["芯片", "芯片", "主板", "晶体管", "IC", "模块", "元器件", "阻容", "电感", "二极管", "三极管", "芯片", "硬件", "单品", "器件"];
  const materialKeywords = ["材料", "钢块", "塑胶", "化纤", "金属", "板材", "化工", "物料", "不锈钢", "合金", "材质", "水泥"];
  const certKeywords = ["认证", "资质", "评估", "审核", "备案", "ISO", "3C", "CE", "FCC", "体系", "资质审核"];
  const testKeywords = ["检测", "检验", "理化", "化验", "测试", "做实验", "可靠性", "破坏性", "寿命", "拉力"];

  if (chipKeywords.some(kw => text.includes(kw))) {
    serviceType = ServiceType.WUYUAN;
  } else if (materialKeywords.some(kw => text.includes(kw))) {
    serviceType = ServiceType.CL;
  } else if (certKeywords.some(kw => text.includes(kw))) {
    serviceType = ServiceType.RZPG;
  } else if (testKeywords.some(kw => text.includes(kw))) {
    serviceType = ServiceType.JYJC;
  }

  // Attempt names
  let companyName = companyMatch ? companyMatch[0] : "";
  if (!companyName && (text.includes("深圳") || text.includes("广州") || text.includes("北京") || text.includes("上海"))) {
    companyName = "某地区高精尖特新企业";
  }

  // Contact name heuristics
  let name = "";
  const nameMatch = text.match(/(?:我是|联系人是|鄙人|叫)([\u4e00-\u9fa5]{2,4})/);
  if (nameMatch) {
    name = nameMatch[1];
  } else {
    name = "业务代表";
  }

  return {
    companyName: companyName || "",
    industry: text.includes("通信") ? "电子通信" : text.includes("汽车") ? "汽车制造" : text.includes("医疗") ? "医疗器械" : "通用制造业",
    contactName: name,
    contactPhone: phoneMatch ? phoneMatch[0] : "",
    productName: "智能硬件设备" as any,
    description: text,
    serviceType
  };
}

// Dialog memory
// Maps session conversation token to custom extracted fields state
interface DialogSession {
  companyName: string;
  industry: string;
  contactName: string;
  contactPhone: string;
  productName: string;
  description: string;
  serviceType: ServiceType | "待定" | "";
  isReadyToCreate?: boolean;
}

const chatSessionCache = new Map<string, DialogSession>();

// API endpoints
app.get("/api/orders", (req, res) => {
  res.json({ orders, staffs });
});

app.post("/api/orders", (req, res) => {
  const {
    serviceType,
    productName,
    description,
    companyName,
    industry,
    contactName,
    contactPhone,
    source,
    attachments
  } = req.body;

  const newOrder: Order = {
    id: generateOrderId(),
    serviceType: serviceType || ServiceType.PENDING,
    productName: productName || "未录入产品名称",
    description: description || "无描述",
    companyName: companyName || "普通测试委托方",
    industry: industry || "通用制造业",
    contactName: contactName || "委托常客",
    contactPhone: contactPhone || "",
    attachments: attachments || [],
    source: source || "手动新建",
    status: OrderStatus.PENDING_ACCEPT,
    createdAt: new Date().toISOString(),
    timeoutCount: 0,
    logs: []
  };

  const assignment = dispatchOrder(newOrder);
  newOrder.assignedStaff = assignment.assignedStaff;
  
  if (assignment.assignedStaff) {
    newOrder.status = OrderStatus.PENDING_ACCEPT;
  } else {
    newOrder.status = OrderStatus.UNASSIGNED;
  }

  const creationLog = {
    time: newOrder.createdAt,
    content: `【${newOrder.source}】工单已成功进入调度系统。`,
    author: "系统"
  };
  const dispatchLog = {
    time: new RegExp(/^\d{4}-\d{2}-\d{2}/).test(newOrder.createdAt)
      ? new Date(new Date(newOrder.createdAt).getTime() + 1000).toISOString()
      : new Date().toISOString(),
    content: assignment.log,
    author: "AI派单引擎"
  };

  newOrder.logs = [creationLog, dispatchLog];
  orders.unshift(newOrder);

  res.json({ success: true, order: newOrder });
});

app.get("/api/appointments", (req, res) => {
  res.json({ appointments });
});

app.post("/api/appointments", (req, res) => {
  const {
    hostName,
    hostPhone,
    visitTime,
    visitorName,
    idCard,
    phone,
    reason,
    vehiclePlate,
    companyName,
    carriedItems,
    companions
  } = req.body;

  const newAppointment: Appointment = {
    id: generateAppointmentId(),
    hostName: hostName || "徐永亮",
    hostPhone: hostPhone || "15989066022",
    visitTime: visitTime || new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).replace(/\//g, "-"),
    visitorName: visitorName || "",
    idCard: idCard || "",
    phone: phone || "",
    reason: reason || "业务往来",
    vehiclePlate: vehiclePlate || "",
    companyName: companyName || "",
    carriedItems: carriedItems || "无",
    status: "待来访",
    companions: companions || []
  };

  appointments.unshift(newAppointment);
  res.json({ success: true, appointment: newAppointment });
});

app.post("/api/reset", (req, res) => {
  idCounter = 1004;
  appointmentIdCounter = 1006;
  staffs = [...initialStaffs].map(s => ({ ...s, currentLoad: s.name === "张文元" ? 2 : s.name === "陈认评" ? 3 : s.name === "李材料" ? 1 : 0 }));
  appointments = JSON.parse(JSON.stringify(initialAppointments));
  orders = [
    {
      id: "GD1001",
      serviceType: ServiceType.WUYUAN,
      productName: "车规级MCU芯片",
      description: "需要对车规级MCU芯片在电子控制单元（ECU）中的应用进行选型以及批量供货咨询，要求契合高频振动与耐温指标。",
      companyName: "华为技术有限公司智能终端部",
      industry: "电子通信",
      contactName: "任专员",
      contactPhone: "13800000001",
      attachments: [],
      source: "Manual" as any,
      status: OrderStatus.PROCESSING,
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      assignedStaff: staffs[0],
      timeoutCount: 0,
      logs: [
        { time: new Date(Date.now() - 3600000 * 2).toISOString(), content: "【手动新建】工单已创建成功。", author: "系统" },
        { time: new Date(Date.now() - 3600000 * 1.95).toISOString(), content: "【自动派单】AI自动匹配，工单已指派给元器件业务专员【张文元】。", author: "AI派单引擎" },
        { time: new Date(Date.now() - 3600000 * 1.8).toISOString(), content: "市场专员【张文元】已在线接单。状态更新为「处理中」。", author: "张文元" },
        { time: new Date(Date.now() - 3600000 * 1.2).toISOString(), content: "沟通记录：已致电客户任专员，客户需要先做一批实验性样品测试，已将车规级方案规格书发至客户邮箱。", author: "张文元" }
      ]
    },
    {
      id: "GD1002",
      serviceType: ServiceType.RZPG,
      productName: "车载雷达检测认证",
      description: "开展ISO26262功能安全资质体系认证及配套检测报告评估。",
      companyName: "腾讯科技（深圳）有限公司汽车云事业部",
      industry: "芯片雷达研发",
      contactName: "马经理",
      contactPhone: "13912345678",
      attachments: [],
      source: "AI智能建单",
      status: OrderStatus.PENDING_ACCEPT,
      createdAt: new Date(Date.now() - 3600000 * 0.5).toISOString(),
      assignedStaff: staffs[2],
      timeoutCount: 0,
      logs: [
        { time: new Date(Date.now() - 3600000 * 0.5).toISOString(), content: "【AI智能建单】客户一句话智能对话建单完成。", author: "AI智能助理" },
        { time: new Date(Date.now() - 3600000 * 0.48).toISOString(), content: "【自动派单】匹配认证评估业务，由于李专员负载较轻但专业不对口，已择优指派给认证专员【陈认评】。", author: "AI派单引擎" }
      ]
    },
    {
      id: "GD1003",
      serviceType: ServiceType.JYJC,
      productName: "材料抗疲劳理化测试",
      description: "新能源大巴底盘焊接点结构钢材抗拉力及长期抗疲劳振动理化检测。",
      companyName: "比亚易股份有限公司乘用车研发院",
      industry: "汽车制造",
      contactName: "王工",
      contactPhone: "13500001111",
      attachments: [],
      source: "AI表单回填",
      status: OrderStatus.COMPLETED,
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      assignedStaff: staffs[3],
      timeoutCount: 0,
      logs: [
        { time: new Date(Date.now() - 3600000 * 24).toISOString(), content: "【AI表单回填】客户提交了回填修改后的咨询表单。", author: "系统" },
        { time: new Date(Date.now() - 3600000 * 23.9).toISOString(), content: "【自动派单】指派给检验检测业务专员【周检测】（当前负载最小：0项）。", author: "AI派单引擎" },
        { time: new Date(Date.now() - 3600000 * 23.5).toISOString(), content: "【周检测】已接单开始跟进。", author: "周检测" },
        { time: new Date(Date.now() - 3600000 * 5).toISOString(), content: "跟进日志：已协助安排实验室机台，并于今天上午出具了初步理化检验报告。客户表示报告格式满足出厂要求，感谢专家协助！", author: "周检测" },
        { time: new Date(Date.now() - 3600000 * 4.9).toISOString(), content: "工单处理成功，交易关闭完结。", author: "系统" }
      ]
    }
  ];
  res.json({ success: true });
});

// --------------------------------------------------------------------------
// Helper: Appointments Simulated NLP Parse Fallback
// --------------------------------------------------------------------------
function simulateAppointmentsExtract(text: string): {
  hostName: string;
  visitTime: string;
  visitorName: string;
  idCard: string;
  phone: string;
  reason: string;
  vehiclePlate: string;
  companyName: string;
  carriedItems: string;
  companions: string[];
} {
  const phoneMatch = text.match(/1[3-9]\d{9}/);
  const idCardMatch = text.match(/\d{17}[\dXx]|\d{15}/);
  const plateMatch = text.match(/[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z]·?[A-HJ-NP-Z0-9]{4,5}[A-HJ-NP-Z0-9挂学警港澳]/);

  let visitorName = "";
  let hostName = "徐永亮";
  
  const visitorMatch = text.match(/(?:我是|叫|来访人[是|：]|姓名[是|：]\s*)([\u4e00-\u9fa5]{2,4})/);
  if (visitorMatch) {
    visitorName = visitorMatch[1];
  } else {
    const nameCandidate = text.match(/([\u4e00-\u9fa5]{2,3})/);
    if (nameCandidate) visitorName = nameCandidate[1];
  }

  const hostMatch = text.match(/(?:拜访|找|对接人[是|：]|受访人[是|：]\s*)([\u4e00-\u9fa5]{2,4})/);
  if (hostMatch) {
    hostName = hostMatch[1];
  }

  let reason = "业务往来";
  if (text.includes("检测") || text.includes("测试") || text.includes("检验")) {
    reason = "预约送样检测";
  } else if (text.includes("会议") || text.includes("开会") || text.includes("洽谈")) {
    reason = "专题技术会议";
  } else if (text.includes("面试") || text.includes("求职")) {
    reason = "招聘面试";
  }

  let carriedItems = "无";
  if (text.includes("电脑") || text.includes("笔记本")) {
    carriedItems = "手提电脑";
  } else if (text.includes("样品") || text.includes("芯片") || text.includes("材料")) {
    carriedItems = "待检样品仪器";
  }

  let companions: string[] = [];
  const compMatch = text.match(/(?:随行人员|随同人员|带了|带上\s*)([\u4e00-\u9fa5、\s]+)/);
  if (compMatch) {
    companions = compMatch[1].split(/[、\s]+/).filter(x => x.length >= 2 && x.length <= 4);
  }

  let visitTime = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).replace(/\//g, "-");
  if (text.includes("明天")) {
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    visitTime = tmr.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).replace(/\//g, "-");
  } else if (text.includes("后天")) {
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    visitTime = dayAfter.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).replace(/\//g, "-");
  } else {
    const dateMatch = text.match(/(\d{1,2})[月|-](\d{1,2})/);
    if (dateMatch) {
      const yr = new Date().getFullYear();
      visitTime = `${yr}年${dateMatch[1]}月${dateMatch[2]}日`;
    }
  }

  let companyName = "";
  const compNameMatch = text.match(/([a-zA-Z\u4e00-\u9fa5]{3,15}(?:有限公司|集团|工厂|部|科(?:技|工)))/) || text.match(/[公司|集团]/);
  if (compNameMatch) {
    companyName = compNameMatch[1];
  }

  return {
    hostName,
    visitTime,
    visitorName,
    idCard: idCardMatch ? idCardMatch[0] : "",
    phone: phoneMatch ? phoneMatch[0] : "",
    reason,
    vehiclePlate: plateMatch ? plateMatch[0] : "",
    companyName,
    carriedItems,
    companions
  };
}

// --------------------------------------------------------------------------
// API: One-sentence quick fill with Gemini Parser
// --------------------------------------------------------------------------
app.post("/api/orders/ai-parse", async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Text is required." });
  }

  const ai = getAiClient();
  if (ai) {
    try {
      const prompt = `您是专业数据录入助手。请分析以下文本，并提取出用于建单的数据字段：
- companyName (客户公司/单位全称，如果没有则填空。尽量根据上下文判断，以"有限公司"、"集团"、"工厂"等为线索)
- industry (公司所属行业)
- contactName (联系人姓名)
- contactPhone (11位联系电话，匹配手机号)
- productName (需要检测的产品名称/样品名称)
- description (具体的客户业务需求/检测需求)
- serviceType (服务类型，必须从以下四类中严格匹配其中一个：元器件、材料、认证评估、检验检测，若都不符合则填待定)

【用户文本】："${text}"

请严格返回符合以下 Schema 约束的 JSON 格式：
{
  "companyName": "...",
  "industry": "...",
  "contactName": "...",
  "contactPhone": "...",
  "productName": "...",
  "description": "...",
  "serviceType": "..."
}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      return res.json({ success: true, data: parsed, isSimulated: false });
    } catch (e) {
      console.error("Gemini Quick parse error:", e);
    }
  }

  const simulated = simulateLocalExtract(text);
  return res.json({ success: true, data: simulated, isSimulated: true });
});

// --------------------------------------------------------------------------
// API: Appointment quick fill with Gemini Parser
// --------------------------------------------------------------------------
app.post("/api/appointments/ai-parse", async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Text is required." });
  }

  const ai = getAiClient();
  if (ai) {
    try {
      const prompt = `您是专业来访接待自动登记助手。请从以下文本中提取来访人员信息：
- hostName (受访员工姓名/对接人，若没提及通常默认为"徐永亮")
- visitTime (来访时间，通常为具体日期，如果没有则根据上下文判断)
- visitorName (来访访客姓名/预约人)
- idCard (身份证号，通常为18位 or 15位)
- phone (11位联系电话，匹配手机号)
- reason (来访事由，如“商务洽谈”、“技术交流”、“送样检测”)
- vehiclePlate (车牌号，如“粤A88888”)
- companyName (访客所在的公司/单位全称)
- carriedItems (随身携带物品，如“笔记本电脑”)
- companions (随行人员姓名列表，JSON数组 of string)

【用户文本】："${text}"

请严格返回符合以下 Schema 约束的 JSON 格式：
{
  "hostName": "...",
  "visitTime": "...",
  "visitorName": "...",
  "idCard": "...",
  "phone": "...",
  "reason": "...",
  "vehiclePlate": "...",
  "companyName": "...",
  "carriedItems": "...",
  "companions": ["..."]
}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const parsed = JSON.parse(response.text || "{}");
      return res.json({ success: true, data: parsed, isSimulated: false });
    } catch (e) {
      console.error("Gemini Appointment Quick parse error:", e);
    }
  }

  const simulated = simulateAppointmentsExtract(text);
  return res.json({ success: true, data: simulated, isSimulated: true });
});

// --------------------------------------------------------------------------
// API: WeChat Dialog bot matching endpoint
// --------------------------------------------------------------------------
app.post("/api/orders/chat", async (req, res) => {
  const { sessionToken, messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages array is required." });
  }

  const token = sessionToken || "default_session";
  let currentSession = chatSessionCache.get(token);
  if (!currentSession) {
    currentSession = {
      companyName: "",
      industry: "",
      contactName: "",
      contactPhone: "",
      productName: "",
      description: "",
      serviceType: ""
    };
    chatSessionCache.set(token, currentSession);
  }

  const lastUserText = (messages[messages.length - 1]?.content || "").trim();

  const getMissingFields = (s: DialogSession) => {
    const missing = [];
    if (!s.companyName) missing.push("单位公司全称");
    if (!s.contactName) missing.push("联系姓名");
    if (!s.contactPhone) missing.push("联系电话");
    if (!s.description) missing.push("服务检测需求");
    if (!s.industry) missing.push("所属行业");
    return missing;
  };

  const isBusinessIntro = /介绍|资质|建立|背景|概况|实验室简介/i.test(lastUserText);
  const isBusinessConsult = /咨询|收费|价格|测试项目|怎么收费|检测服务|机时/i.test(lastUserText);
  const isVisitorReady = /来访政策|预约流程|访客须知|怎么去|来访预约说明|注意事项|报备/i.test(lastUserText);
  const isEntrustInquiry = /委托|进度|查询|订单|进展|工单/i.test(lastUserText);
  const isOfflineTraining = /培训|课程|培训班|学费|开班/i.test(lastUserText);
  const isTopicAnalysis = /专题|解读|标准|RoHS|17025|AEC-Q/i.test(lastUserText);
  const isNewsDynamics = /新闻|动态|前沿|落成|喜报|报道/i.test(lastUserText);

  const ai = getAiClient();
  if (!ai) {
    // FALLBACK CHAT DIALOG ENGINE (Keys-free robust simulator covering all requested 7 features!)
    console.log("Using Mock Chat Engine for Session", token);
    
    if (isBusinessIntro) {
      return res.json({
        text: `🏢 **中国工业实验室 (赛宝实验室) · 核心业务介绍**
--------------------------------------------------
中国工业实验室成立于1955年，是国内历史最悠久、资质最齐全 of 工业基础公共技术支撑平台：
1. **国家级资质认可**：拥有国家 **CNAS（中国合格评定国家认可委员会）** 及 **CMA（检验检测机构资质认定）** 双重金牌资质。
2. **实验室宗旨**：专注解决高尖端及卡脖子领域中的“芯片、材料、可靠性、标准认证”难题，为数万家工业、汽车及国防科研单位承制质量护航。
3. **技术分布**：在粤港澳大湾区、长三角及华北设立大型集成化测试分所，构建端到端一站式检验检测链。

*如果您想在此登记预约检测需求，可以直接对我说“我想登记业务”，我随时为您拉起建单流！*`,
        extractedFields: currentSession,
        isComplete: false,
        action: "CONTINUE"
      });
    }

    if (isBusinessConsult) {
      return res.json({
        text: `💡 **业务咨询范围与收费测算细则**
--------------------------------------------------
我们提供四大支柱检测版块，支持多标准、短周期、个性化委托：
- **芯片元器件**：提供车规级 AEC-Q100/104/200 全套老化破坏性物理分析 (DPA)、电磁兼容 (EMC) 试验。
- **先进材料检测**：提供拉伸硬度、金相缺陷、RoHS 2.0 十项有毒物化学色谱精密检测。
- **可靠性与疲劳**：高低温快速交变、三综合振动、盐雾防腐蚀测试（可连续运行数千小时）。
- **收费机制**：实行“机时机物阶梯折算制”。常规理化测试约 **150 ~ 280元/小时**，大型交变 and EMC暗室实机约 **350 ~ 500元/小时**，量大可尊享企业长期优惠包。
- **联系方式**：您留存的电话将直接匹配对应行业的高级评估师为您定制专属检测方案。`,
        extractedFields: currentSession,
        isComplete: false,
        action: "CONTINUE"
      });
    }

    if (isVisitorReady) {
      return res.json({
        text: `📅 **实验室访客来访预约政策及安全须知**
--------------------------------------------------
外部人员进所请遵守以下守则：
1. **前置登记**：所有来访访客须提前通过本小程序【**登记来访预约**】自主或口语录入来访人身份证、11位有效手机及到访时间。若开车前往，请务必填写车辆车牌以便自动匹配起驳杆闸。
2. **接待时间**：周一至周五 **08:30 - 17:30**。其余休息日仅针对紧急复检提供绿色审核通道。
3. **核验凭证**：请务必携带本人**物理身份证原件**，在闸机出入口刷身份证进行白名单活体比对。
4. **行为规范**：进入实验核心区域需受访人专属陪同，严禁擅自触碰正在运行 of 长期疲劳试验设备，且禁止任何形式的影像记录。`,
        extractedFields: currentSession,
        isComplete: false,
        action: "CONTINUE"
      });
    }

    if (isOfflineTraining) {
      return res.json({
        text: `🎓 **2026年线下高阶精品培训计划与报名通道**
--------------------------------------------------
本年度重点推出三款实战演练班，由CNAS资深评审员与失效分析总工程师授课，结业颁发国家认可证书：

1. **【广州班】实验室质量体系内审员实操高级班**
   - **时间**：2026年6月15日 - 6月18日 (共4天)
   - **内容**：精细解读 ISO/IEC 17025:2017 质量控制、量值溯源及内审整改。
   - **学费**：**3200元/人** (含教材、午餐与现场实操辅导)

2. **【深圳班】车规级 AQC-Q 芯片测试及热失效失效分析培训班**
   - **时间**：2026年7月3日 - 7月5日 (共3天)
   - **内容**：针对AEC-Q100标准的集成电路温应力、机械应力试验与失效判断。
   - **学费**：**1800元/人** (适合车企、设计公司研发及品质经理)

3. **【上海班】高加速寿命寿命(HALT/HASS)试验与工程应用技能课**
   - **时间**：2026年7月20日 - 7月22日 (共3天)
   - **内容**：涵盖应力极限步进试验、振动控制、应力筛查工程典型案例。
   - **学费**：**2800元/人**

*📌 报名提醒：可以直接把您心仪的“姓名+手机号+公司”发给我，我全自动为您锁定席位！*`,
        extractedFields: currentSession,
        isComplete: false,
        action: "CONTINUE"
      });
    }

    if (isTopicAnalysis) {
      return res.json({
        text: `📚 **赛宝行业标准与重点专题深度解读**
--------------------------------------------------
赛宝分析技术专家为您汇总当前最受关注的三大行业法规体系：

- 🏷️ **专题一：ISO/IEC 17025：2017 实验室评定标准**
  - *解读*：质量控制核心在于证明检测和校准结果的“不确定度”在可控区间。重点控制设备可溯源链条及对非标方法的确认过程，这是通过CNAS认可的执业刚需。
- 🚗 **专题二：车规级 AEC-Q100 芯片评测认证秘诀**
  - *解读*：不同于民用消费级，车规芯片需要在-40℃至+150℃等极端坏境下工作。包括温度循环试验（500/1000次）、高加速温湿度偏置、早期寿命失效率检测，是国产替代芯片进入车厂供应白名单的敲门砖。
- 🧪 **专题三：欧盟 RoHS 2.0 (2011/65/EU) 检测最新要求**
  - *解读*：严格控制特定电子电气产品中10类限制物质（如铅、汞、镉、四类邻苯二甲酸酯）。其浓度阈值必须在0.1wt%以下，重点关注材料的分拆制样与化学前处理质谱分析。`,
        extractedFields: currentSession,
        isComplete: false,
        action: "CONTINUE"
      });
    }

    if (isNewsDynamics) {
      return res.json({
        text: `📰 **赛宝前沿新闻动态与最新发展里程碑**
--------------------------------------------------
本月最新官方资讯为您播报：

1. **【暗室建成】国内顶尖华南5米法整车级电磁兼容(EMC)暗室正式投用**。
   - 能够对新能源重卡及大型电动乘用车实施全3D空间射频OTA接收灵敏度、天线效率测试，支持国际及欧盟新能源车辆一站式准入，缩短研发认证周期。
2. **【行业喜报】中国工业实验室名列全国检测服务百强前茅**。
   - 在国家质量强国战略行动进展通报会上发布的数据显示，本实验室在行业用户满意度及公共支持测算中荣获全国第6名。
3. **【科技共建】与国际某一流通信终端集团共建人工智能元器件多维应力分析中心**。
   - 融合端到端热成像与CT微损切片，探索智能穿戴芯片在深探高湿等前沿多维度工作环境下的极限可靠性演化规律。`,
        extractedFields: currentSession,
        isComplete: false,
        action: "CONTINUE"
      });
    }

    if (isEntrustInquiry) {
      const latest = orders[0];
      if (latest) {
        return res.json({
          text: `🔍 **为您实时检索到最新委托进度：**
--------------------------------------------------
- **工单流水号**：${latest.id}
- **委托单位**：${latest.companyName || "广州蚁群信息科技有限公司"}
- **产品名称**：${latest.productName || "多样本测试模组"}
- **当前状态**：${latest.status === OrderStatus.UNASSIGNED ? "待系统派单" : latest.status === OrderStatus.PENDING_ACCEPT ? "待接单" : latest.status === OrderStatus.PROCESSING ? "工程师检测中" : "已完成"}
- **执行专员**：${latest.assignedStaff?.name || "谢经理(人工介入分配中)"}
- **最新跟进事件**：${latest.logs[latest.logs.length - 1]?.content || "提交系统正在派分中"}
- **剩余计划时效**：24小时内

*💡 提示：如需对上述单据加快，您可以在右侧后台查看实时工单响应，也可以对我说“催办工单”！*`,
          extractedFields: currentSession,
          isComplete: false,
          action: "CONTINUE"
        });
      } else {
        return res.json({
          text: `🔍 **委托进度查询**
--------------------------------------------------
目前您的会话名下暂无已提交的业务委托单。
*提示：如果您想进行检测咨询建单，您可以把“产品名称、检测标准、联系姓名及电话”发我，我会立即帮您在线立案！*`,
          extractedFields: currentSession,
          isComplete: false,
          action: "CONTINUE"
        });
      }
    }

    // Default: Continue order-taking semantic extraction
    const parsedSim = simulateLocalExtract(lastUserText);
    if (parsedSim.companyName) currentSession.companyName = parsedSim.companyName;
    if (parsedSim.contactPhone) currentSession.contactPhone = parsedSim.contactPhone;
    if (parsedSim.contactName && parsedSim.contactName !== "业务代表") currentSession.contactName = parsedSim.contactName;
    if (parsedSim.serviceType !== ServiceType.PENDING) currentSession.serviceType = parsedSim.serviceType;
    if (parsedSim.description && parsedSim.description.length > 10) currentSession.description = parsedSim.description;
    if (parsedSim.industry) currentSession.industry = parsedSim.industry;

    const missed = getMissingFields(currentSession);

    // If we only have some fields, check context to prompt or confirm
    if (lastUserText.includes("确认") || lastUserText.includes("生成") || lastUserText.toLowerCase().includes("ok") || lastUserText.includes("是的")) {
      if (missed.length === 0) {
        // Trigger auto construction
        const completedSession = { ...currentSession };
        const finalOrder: Order = {
          id: generateOrderId(),
          serviceType: (completedSession.serviceType as any) || ServiceType.PENDING,
          productName: completedSession.productName || "智能样品",
          description: completedSession.description || "全自动对话生成需求",
          companyName: completedSession.companyName,
          industry: completedSession.industry || "未知行业",
          contactName: completedSession.contactName,
          contactPhone: completedSession.contactPhone,
          attachments: [],
          source: "AI智能建单",
          status: OrderStatus.UNASSIGNED,
          createdAt: new Date().toISOString(),
          timeoutCount: 0,
          logs: [{ time: new Date().toISOString(), content: "【模拟对话全自动建单】客户确认，自动录入门户数据库。", author: "自动助理" }]
        };

        const result = dispatchOrder(finalOrder);
        if (result.assignedStaff) {
          finalOrder.status = OrderStatus.PENDING_ACCEPT;
          finalOrder.assignedStaff = result.assignedStaff;
        }
        finalOrder.logs.push({ time: new Date().toISOString(), content: result.log, author: "派单引擎" });
        orders.unshift(finalOrder);

        chatSessionCache.delete(token);

        return res.json({
          text: `【模拟建单】\n🎉 恭喜！工单已全自动后台生成成功！\n工单流水号：${finalOrder.id}\n专属业务专员已由系统自动择优指派对接。由于本系统为全链路演练舱，您可以在右侧【后台管理工作台】立即看到该工单的实时接工流转和短信派发！`,
          extractedFields: completedSession,
          isComplete: true,
          action: "CREATE_ORDER"
        });
      } else {
        const missedFields = getMissingFields(currentSession);
        return res.json({
          text: `我们已经记录了部分需求，但为了全自动派发精准业务专员，仍需要补充：【${missedFields.join("、")}】。请问您的 ${missedFields[0]} 是什么呢？`,
          extractedFields: currentSession,
          isComplete: false,
          action: "CONTINUE"
        });
      }
    }

    // Determine if complete
    const isNowReady = missed.length === 0;
    currentSession.isReadyToCreate = isNowReady;

    if (isNowReady) {
      return res.json({
        text: `【工单信息确认】
服务类型：${currentSession.serviceType}
单位名称：${currentSession.companyName}
所属行业：${currentSession.industry}
联系人：${currentSession.contactName}
联系电话：${currentSession.contactPhone}
业务需求：${currentSession.description}

请问上述信息是否确认无误并为您生成工单？您可以直接回答：“是的”、“确认” 或 “没有问题”。`,
        extractedFields: currentSession,
        isComplete: true,
        action: "CONFIRM"
      });
    } else {
      let followUp = "";
      const currentMissed = missed[0];
      if (currentMissed === "单位公司全称") {
        followUp = "非常荣幸为您提供检测技术咨询！请问您公司的【单位全称】是什么呢？另外方便透露您所属的【具体行业】吗？";
      } else if (currentMissed === "联系姓名") {
        followUp = "好的，请问该怎么称呼您呢（【联系人姓名】）？";
      } else if (currentMissed === "联系电话") {
        followUp = "收到。请问方便留一个您的【联系人手机号码】吗？以便专属领域市场专员与您秒对接。";
      } else if (currentMissed === "服务检测需求") {
        followUp = "已记下您的企业信息。请问您需要检测的具体样品名及【核心测试需求 / 指标】是什么呢？";
      } else {
        followUp = "请问您目前公司的主要【所属行业】是什么呢？";
      }
      return res.json({
        text: followUp,
        extractedFields: currentSession,
        isComplete: false,
        action: "CONTINUE"
      });
    }
  }

  // Gemini logic
  try {
    const dialogHistory = messages.map(m => `${m.sender === "user" ? "用户" : "AI智能建单助手"}: ${m.content}`).join("\n");

    const promptText = `你是企业业务咨询智能建单助手。正在与用户进行多轮对话流。
    你只能做三件事：1抽取用户需求信息、2自动归类四大服务类别、3缺字段主动追问，齐全后整理工单让用户确认。

    【固定四大分类原则（严格匹配，不可自创）】
    1. 元器件：芯片、机电、电子、零部件、模块等
    2. 材料：原材料、塑胶、金属、板材、物料材质等
    3. 认证评估：资质认证、体系认证、检测评估、ISO、CCC等配置
    4. 检验检测：理化测试、可靠性疲劳测试、实验、化验等

    【当前会话累积已抽取到的字段状态（供你参考和修改更新）】
    - 公司单位名称: "${currentSession.companyName}"
    - 所属行业: "${currentSession.industry}"
    - 联系姓名: "${currentSession.contactName}"
    - 联系电话: "${currentSession.contactPhone}"
    - 业务描述: "${currentSession.description}"
    - 服务分类: "${currentSession.serviceType}"

    【当前用户最新输入输入】
    "${lastUserText}"

    【系统流程指导】
    1. 判定最新输入中是否含有能补充目前空缺字段（公司、行业、姓名、电话、需求、分类）的信息。若有，请把它们融入到抽取的JSON对象中。
    2. 如果用户说 “确认建单”、“确认”、“生成”、“是的”、“没有问题”、“OK” 此时如果五个必填全齐了，必须输出指令: 【自动建单】。
    3. 如果仍有“必填字段”空缺（单位、行业、联系人、电话、需求），请从空缺栏位中挑选【正好一个】最关键的缺项以高情商中方的口吻进行追问。严禁一次性问多个字段！
    4. 如果五个必选信息均已完备且尚未进行最终确认，请整合成格式极其严苛、如下形式的工单预览：
    【工单信息确认】
    服务类型：[自动识别的四类之一或待定]
    单位名称：[抽取结果]
    所属行业：[抽取结果]
    联系人：[抽取结果]
    联系电话：[抽取结果]
    业务需求：[抽取结果]

    请问信息是否确认无误并为您生成工单？

    请务必返回符合以下 Schema 约束 of JSON：
    {
      "replyText": "给客户的文本回复。要亲切、简明，只问一个缺失的字段、或直接向客户呈现【工单信息确认】模板",
      "action": "CONTINUE" (继续问), "CONFIRM" (确认页面), "CREATE" (客户正式确认，触发建单),
      "extracted": {
         "companyName": "更新后的单位",
         "industry": "更新后的行业",
         "contactName": "更新后的姓名",
         "contactPhone": "电话",
         "productName": "产品名",
         "description": "需求详情",
         "serviceType": "归类的四类之一"
      }
    }`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["replyText", "action", "extracted"],
          properties: {
            replyText: { type: Type.STRING },
            action: { type: Type.STRING, description: "Must be CONTINUE, CONFIRM or CREATE" },
            extracted: {
              type: Type.OBJECT,
              properties: {
                companyName: { type: Type.STRING },
                industry: { type: Type.STRING },
                contactName: { type: Type.STRING },
                contactPhone: { type: Type.STRING },
                productName: { type: Type.STRING },
                description: { type: Type.STRING },
                serviceType: { type: Type.STRING }
              }
            }
          }
        }
      }
    });

    const output = JSON.parse(response.text?.trim() || "{}");
    const extr = output.extracted || {};
    
    // Save to cache
    currentSession.companyName = extr.companyName || currentSession.companyName;
    currentSession.industry = extr.industry || currentSession.industry;
    currentSession.contactName = extr.contactName || currentSession.contactName;
    currentSession.contactPhone = extr.contactPhone || currentSession.contactPhone;
    currentSession.productName = extr.productName || currentSession.productName;
    currentSession.description = extr.description || currentSession.description;
    currentSession.serviceType = extr.serviceType || currentSession.serviceType;

    if (output.action === "CREATE") {
      // Create actual database record
      const finalOrder: Order = {
        id: generateOrderId(),
        serviceType: (currentSession.serviceType as any) || ServiceType.PENDING,
        productName: currentSession.productName || "智能样品",
        description: currentSession.description,
        companyName: currentSession.companyName,
        industry: currentSession.industry || "通用服务",
        contactName: currentSession.contactName,
        contactPhone: currentSession.contactPhone,
        attachments: [],
        source: "AI智能建单",
        status: OrderStatus.UNASSIGNED,
        createdAt: new Date().toISOString(),
        timeoutCount: 0,
        logs: [{ time: new Date().toISOString(), content: "【AI对话全自动建单】客户确认，自动录入门户数据库。", author: "AI智能助理" }]
      };

      const result = dispatchOrder(finalOrder);
      if (result.assignedStaff) {
        finalOrder.status = OrderStatus.PENDING_ACCEPT;
        finalOrder.assignedStaff = result.assignedStaff;
      }
      finalOrder.logs.push({ time: new Date().toISOString(), content: result.log, author: "派单引擎" });
      orders.unshift(finalOrder);

      // clear dialogue session
      chatSessionCache.delete(token);

      return res.json({
        text: `【自动建单】\n🎉 恭喜！工单已全自动后台生成成功！\n工单流水号：${finalOrder.id}\n专属业务专员已由系统自动择优指派对接。由于本系统为全链路演练舱，您可以在右侧【后台管理工作台】立即看到该工单的实时接工流转和短信派发！`,
        extractedFields: extr,
        isComplete: true,
        action: "CREATE_ORDER"
      });
    } else {
      return res.json({
        text: output.replyText,
        extractedFields: currentSession,
        isComplete: output.action === "CONFIRM",
        action: output.action
      });
    }
  } catch (err: any) {
    console.error("Gemini Multi-turn Session Error:", err);
    // Gracefully handle session in local fallback
    return res.json({
      text: "非常抱歉，网络连接或解析稍微有点拥堵。我已经暂时缓存了您刚才说的内容。请问您的【联系电话】是多少呢？",
      extractedFields: currentSession,
      isComplete: false,
      action: "CONTINUE"
    });
  }
});

// --------------------------------------------------------------------------
app.post("/api/orders/:id/accept", (req, res) => {
  const { id } = req.params;
  const order = orders.find(o => o.id === id);
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  order.status = OrderStatus.PROCESSING;
  const now = new Date().toISOString();
  order.logs.push({
    time: now,
    content: `市场跟进顾问【${order.assignedStaff?.name || "专属专员"}】已在线接单。工单正式进入处理环节。`,
    author: order.assignedStaff?.name || "系统"
  });

  // Automatically trigger User Notification / Push Touchpoint logs as specified in criteria section 5:
  // "系统自动执行两项推送动作，全程无需人工操作："
  // 1. 小程序对话框中推送：专员专属联系方式、企业微信对接二维码等
  // 2. 小程序服务通知同步提醒用户已接工
  order.logsToUserEnabled = true;
  order.logs.push({
    time: now,
    content: `【秒对接自动触达：推送微信服务通知】已向用户「服务通知」消息终端，推送即时接工卡片。`,
    author: "系统自动推送"
  });

  order.logs.push({
    time: now,
    content: `【秒对接自动触达：推送小程序交互卡】已全自动在小程序对话框中，向该用户推送顾问【${order.assignedStaff?.name}】的直连电话：${order.assignedStaff?.phone} 及专属企业微信一对一免验证客服二维码。`,
    author: "AI触达助理"
  });

  res.json({ success: true, order });
});

// --------------------------------------------------------------------------
// API: Add trace log (Staff workflow)
// --------------------------------------------------------------------------
app.post("/api/orders/:id/log", (req, res) => {
  const { id } = req.params;
  const { content, author } = req.body;
  const order = orders.find(o => o.id === id);
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  const now = new Date().toISOString();
  order.logs.push({
    time: now,
    content,
    author: author || order.assignedStaff?.name || "市场专员"
  });

  res.json({ success: true, order });
});

// --------------------------------------------------------------------------
// API: Finish/Close Order (Staff workflow)
// --------------------------------------------------------------------------
app.post("/api/orders/:id/finish", (req, res) => {
  const { id } = req.params;
  const order = orders.find(o => o.id === id);
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  order.status = OrderStatus.COMPLETED;
  // Decrease current staff load
  if (order.assignedStaff) {
    order.assignedStaff.currentLoad = Math.max(0, order.assignedStaff.currentLoad - 1);
  }

  order.logs.push({
    time: new Date().toISOString(),
    content: "市场专员确认该工单咨询事项已圆满解答，执行工单结单、归档关闭。",
    author: "系统结单"
  });

  res.json({ success: true, order });
});

// --------------------------------------------------------------------------
// API: Simulate Order Timeout (System loop)
// --------------------------------------------------------------------------
app.post("/api/orders/:id/timeout", (req, res) => {
  const { id } = req.params;
  const order = orders.find(o => o.id === id);
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  if (order.status !== OrderStatus.PENDING_ACCEPT) {
    return res.status(400).json({ error: "Only pending acceptance order can timeout." });
  }

  const prevStaff = order.assignedStaff;
  const now = new Date().toISOString();

  if (order.timeoutCount === 0) {
    // Stage 1 Timeout: Recycle and re-assign to next best staff of the same category
    order.timeoutCount = 1;
    if (prevStaff) {
      prevStaff.currentLoad = Math.max(0, prevStaff.currentLoad - 1);
    }

    order.logs.push({
      time: now,
      content: `⚠️ 【超时预警】系统监测到专员【${prevStaff?.name}】未在派单时效内进行接单。系统执行超时接管，自动回收派单资源。`,
      author: "自动巡检套件"
    });

    // Try to find a different staff matching same specialty
    const nextCandidates = staffs.filter(s => s.isAvailable && s.name !== prevStaff?.name);
    const specialtyMatches = nextCandidates.filter(s => s.specialty === order.serviceType);

    if (specialtyMatches.length > 0) {
      specialtyMatches.sort((a, b) => a.currentLoad - b.currentLoad);
      const chosen = specialtyMatches[0];
      chosen.currentLoad += 1;
      order.assignedStaff = chosen;
      order.logs.push({
        time: now,
        content: `【二次自动派工】AI引擎深度优选，重新转指派给同领域空闲顾问【${chosen.name}】（当前负载：${chosen.currentLoad - 1}件）接续跟进。`,
        author: "AI派单引擎"
      });
    } else {
      // Pick generic lowest load staff
      nextCandidates.sort((a, b) => a.currentLoad - b.currentLoad);
      if (nextCandidates.length > 0) {
        const chosen = nextCandidates[0];
        chosen.currentLoad += 1;
        order.assignedStaff = chosen;
        order.logs.push({
          time: now,
          content: `【二次自动派工】由于无其他同领域专家可用，采取全域负载分红法重新分派给顾问【${chosen.name}】跟进。`,
          author: "AI派单引擎"
        });
      } else {
        order.status = OrderStatus.UNASSIGNED;
        order.assignedStaff = undefined;
        order.logs.push({
          time: now,
          content: `【自动派工失败】无可用其余在岗客服，工单自动回流等待处理。`,
          author: "AI派单引擎"
        });
      }
    }
  } else {
    // Stage 2 Timeout: Transfer to Manager pools
    order.timeoutCount = 2;
    order.status = OrderStatus.TIMEOUT;
    if (prevStaff) {
      prevStaff.currentLoad = Math.max(0, prevStaff.currentLoad - 1);
    }
    order.assignedStaff = undefined;

    order.logs.push({
      time: now,
      content: `❌ 【连续二次接单超时宣告】工单二次分派后仍然超时未接单。大模型AI引擎终止自动化分配流程，将当前工单推入手工紧急审批池通道。`,
      author: "自动巡检套件"
    });

    order.logs.push({
      time: now,
      content: `【升级指配】通知已发送给市场部负责人【谢经理】，升级为“特急”级高危催办件，触发专员催回机制。`,
      author: "谢经理人工审批池"
    });
  }

  res.json({ success: true, order });
});

// Evaluate order completions (User workflow)
app.post("/api/orders/:id/evaluate", (req, res) => {
  const { id } = req.params;
  const { stars, feedback } = req.body;
  const order = orders.find(o => o.id === id);
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  order.evaluation = { stars, feedback };
  order.logs.push({
    time: new Date().toISOString(),
    content: `【用户自主评分】客户对本次咨询进行了评分：${"⭐".repeat(stars)}，感言反馈：${feedback || "暂无附言"}`,
    author: "用户反馈"
  });

  res.json({ success: true, order });
});

// --------------------------------------------------------------------------
// API: Real-time order progress query with NLP (Natural Language Processing)
// --------------------------------------------------------------------------
app.post("/api/orders/progress-query", async (req, res) => {
  const { queryText } = req.body;
  if (!queryText) {
    return res.status(400).json({ error: "Missing queryText" });
  }

  // Find users' current orders representing progress
  // Since we are simulating, we display the user's active/latest outstanding orders in the response
  const activeOrders = orders.map(o => ({
    id: o.id,
    company: o.companyName,
    status: o.status,
    product: o.productName,
    staffName: o.assignedStaff?.name || "暂未排队",
    staffPhone: o.assignedStaff?.phone || "",
    latestLog: o.logs[o.logs.length - 1]?.content || "",
    createdAt: o.createdAt
  }));

  const ai = getAiClient();
  if (!ai) {
    // Simulating progress search without keys
    const latest = orders[0];
    const formattingResult = `【工单进度查询结果】
工单编号：${latest.id}
当前状态：${latest.status} | 跟进专员：${latest.assignedStaff?.name || "谢经理(池中待补)"}（电话：${latest.assignedStaff?.phone || "020-87236881"}）
最新跟进记录：${latest.logs[latest.logs.length - 1]?.content}
剩余跟进时效：24小时内

※ 如需紧急加急，您可直接致电咨询顾问或在后台直接添加企业微信！`;
    return res.json({ text: formattingResult, matchedId: latest.id });
  }

  try {
    const promptText = `你是一个工单进度查询助手。用户正在用口语化提问：
    "${queryText}"

    我们的工单数据库中目前的简要工单索引如下：
    ${JSON.stringify(activeOrders, null, 2)}

    请执行以下规则：
    1. 通过用户的提问，智能化匹配他们想查询哪个公司的工单或哪个状态下的最新工单。若无法匹配，默认取列表中第一项（即最新提交的工单）。
    2. 基于匹配出的工单数据（请找到完整的那个工单），生成完美的标准化进度报告。格式格式必须十分精确、且跟原版保持100%一致。
    
    格式模板（严禁遗漏任何汉字与段落结构）：
    【工单进度查询结果】
    工单编号：[工单号例如 GD1001]
    当前状态：[中文如：待分配/待接单/处理中/已完结/已超时]
    跟进专员：[专员姓名兼附电话、无法匹配则显示 市场待分派池（谢经理人工跟进）]
    最新跟进记录：[专员填写的最后一行进展文字、或系统自动分配日志内容]
    剩余跟进时效：24小时内/无需分配

    根据需要，在底部附上一句友好话语促使其加急。请以纯文本形式返回该进度报告。`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText
    });

    const resText = response.text || "";
    // Guess which ID matched
    const matchedId = orders.find(o => resText.includes(o.id))?.id || orders[0]?.id;

    res.json({ text: resText, matchedId });
  } catch (error) {
    console.error("NLP query error:", error);
    const latest = orders[0];
    const formatting = `【工单进度查询结果】
工单编号：${latest.id}
当前状态：${latest.status}
跟进专员：${latest.assignedStaff?.name || "谢经理人手动调度中"}
最新跟进记录：${latest.logs[latest.logs.length - 1]?.content}
剩余跟进时效：24小时内 🚀

如果您极度急迫，我们已自动向您的微信终端推送直连催办单，请直接联系我们！`;
    res.json({ text: formatting, matchedId: latest.id });
  }
});


// Serve files in Express + Vite config pattern:
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Enterprise system backend listening on host 0.0.0.0 port ${PORT}`);
  });
}

startServer();
