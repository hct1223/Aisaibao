/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ServiceType {
  WUYUAN = "元器件",
  CL = "材料",
  RZPG = "认证评估",
  JYJC = "检验检测",
  PENDING = "待定"
}

export enum OrderStatus {
  UNASSIGNED = "待分配",
  PENDING_ACCEPT = "待接单",
  PROCESSING = "处理中",
  PENDING_REVIEW = "待评价",
  COMPLETED = "已完结",
  TIMEOUT = "已超时"
}

export interface SupportStaff {
  name: string;
  phone: string;
  specialty: ServiceType;
  qrCode: string; // Base64 or mock SVG
  currentLoad: number;
  isAvailable: boolean;
}

export interface OrderLog {
  time: string;
  content: string;
  author: string;
}

export interface Order {
  id: string;
  serviceType: ServiceType;
  productName?: string;
  description: string;
  companyName: string;
  industry: string;
  contactName: string;
  contactPhone: string;
  attachments: string[]; // mock file URLs or base64
  source: "AI智能建单" | "AI表单回填" | "手动新建";
  status: OrderStatus;
  createdAt: string;
  assignedStaff?: SupportStaff;
  logs: OrderLog[];
  timeoutCount: number; // 0 = initial, 1 = first timeout (reassigned), 2 = second timeout (to manager pool)
  timeoutDeadline?: string;
  logsToUserEnabled?: boolean;
  evaluation?: {
    stars: number;
    feedback: string;
  };
}

export interface SystemState {
  orders: Order[];
  staffs: SupportStaff[];
}

export interface Companion {
  phone: string;
  name: string;
  idCard: string;
  vehiclePlate?: string;
}

export interface Appointment {
  id: string;
  hostName: string;         // 被访问人姓名
  hostPhone?: string;       // 被访问人电话
  visitTime: string;        // 预约访问时间 (格式：2026年04月24日)
  visitorName: string;      // 来访者姓名
  idCard: string;           // 身份证
  phone: string;            // 手机号
  reason: string;           // 来访事由
  vehiclePlate?: string;    // 来访车辆
  companyName: string;      // 公司名称
  carriedItems?: string;    // 携带物品
  status: "待审批" | "待来访" | "已完成" | "已过期"; // 预约状态
  entryTime?: string;       // 入所时间
  exitTime?: string;        // 离所时间
  companions?: Companion[]; // 同行人
}
