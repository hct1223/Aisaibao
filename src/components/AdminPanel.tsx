import React, { useState } from "react";
import { 
  Users, Briefcase, Clock, AlertTriangle, CheckCircle2, ChevronRight, 
  Send, ShieldAlert, Plus, HelpCircle, Activity, Undo2, LogIn, Check, Play, UserCheck, CheckSquare, Trash2
} from "lucide-react";
import { ServiceType, OrderStatus, Order, SupportStaff } from "../types";

interface AdminPanelProps {
  orders: Order[];
  staffs: SupportStaff[];
  onAcceptOrder: (orderId: string) => void;
  onAddLog: (orderId: string, content: string, author: string) => void;
  onFinishOrder: (orderId: string) => void;
  onTriggerTimeout: (orderId: string) => void;
  onResetDatabase: () => void;
}

export default function AdminPanel({
  orders,
  staffs,
  onAcceptOrder,
  onAddLog,
  onFinishOrder,
  onTriggerTimeout,
  onResetDatabase
}: AdminPanelProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(orders[0]?.id || null);
  const [logContent, setLogContent] = useState("");
  const [simulatedAuthor, setSimulatedAuthor] = useState("周检测");

  const selectedOrder = orders.find(o => o.id === selectedOrderId) || null;

  // Stat computations
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === OrderStatus.UNASSIGNED || o.status === OrderStatus.PENDING_ACCEPT).length;
  const processingOrders = orders.filter(o => o.status === OrderStatus.PROCESSING).length;
  const completedOrders = orders.filter(o => o.status === OrderStatus.COMPLETED).length;
  const timeoutOrders = orders.filter(o => o.status === OrderStatus.TIMEOUT).length;

  const handlePostLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId || !logContent.trim()) return;
    onAddLog(selectedOrderId, logContent.trim(), simulatedAuthor);
    setLogContent("");
  };

  return (
    <div className="flex-1 bg-slate-900 text-slate-100 rounded-3xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-[820px] font-sans">
      
      {/* Top dashboard title & state purge */}
      <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 flex items-center justify-center">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center space-x-1.5">
              <span>中国赛宝市场部全链路业务调度台</span>
              <span className="text-[10px] bg-indigo-500 text-white font-normal px-1.5 py-0.2 rounded-full font-mono uppercase">后台端</span>
            </h1>
            <p className="text-[10px] text-slate-400">大模型自动派工、超时升格监控、实时协作演练舱</p>
          </div>
        </div>
        <button
          onClick={() => {
            if (window.confirm("确认要一键恢复沙箱数据库初始仿真状态吗？现有的修改记录将被重置。")) {
              onResetDatabase();
              setSelectedOrderId(null);
            }
          }}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition duration-150"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span>重置沙箱</span>
        </button>
      </div>

      {/* Grid panels representing statistics */}
      <div className="grid grid-cols-5 border-b border-slate-800 text-center select-none bg-slate-950/40 divide-x divide-slate-800/60 font-sans">
        <div className="py-2.5">
          <p className="text-[9px] text-slate-400">系统总订单数</p>
          <p className="text-base font-bold text-indigo-400 font-mono mt-0.5">{totalOrders}</p>
        </div>
        <div className="py-2.5">
          <p className="text-[9px] text-slate-400">待处理/接单</p>
          <p className="text-base font-bold text-amber-400 font-mono mt-0.5">{pendingOrders}</p>
        </div>
        <div className="py-2.5">
          <p className="text-[9px] text-slate-400">专员跟进中</p>
          <p className="text-base font-bold text-blue-400 font-mono mt-0.5">{processingOrders}</p>
        </div>
        <div className="py-2.5">
          <p className="text-[9px] text-slate-400">已超时升格</p>
          <p className="text-base font-bold text-rose-400 font-mono mt-0.5">{timeoutOrders}</p>
        </div>
        <div className="py-2.5">
          <p className="text-[9px] text-slate-400">已完结归档</p>
          <p className="text-base font-bold text-emerald-400 font-mono mt-0.5">{completedOrders}</p>
        </div>
      </div>

      {/* Primary Work Desk Layout Split */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left column: incoming orders & staff loads */}
        <div className="w-[380px] border-r border-slate-800 flex flex-col overflow-y-auto divide-y divide-slate-800 select-none">
          
          {/* Consultants workload board */}
          <div className="p-4 bg-slate-950/20">
            <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>市场跟进顾问专项负载</span>
              </span>
              <span className="text-[9px] text-emerald-500 bg-emerald-500/10 px-1 rounded">在线轮班中</span>
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {staffs.map((st) => (
                <div key={st.name} className="bg-slate-850 rounded-xl p-2.5 border border-slate-800/80 hover:border-slate-750 transition flex items-start space-x-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-slate-700">
                    <img src={st.qrCode} alt="avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-100 truncate">{st.name}</span>
                      <span className="text-[9px] text-slate-400 scale-95">{st.specialty}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[9px]">
                      <span className="text-slate-400">负载: <strong className="text-indigo-400 font-mono">{st.currentLoad}件</strong></span>
                      <span className="text-emerald-400 font-semibold font-sans">● 在岗</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Core Orders pipeline lists */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5 mb-2.5">
              <Briefcase className="w-3.5 h-3.5 text-blue-400" />
              <span>智能决策分配池订单 ({orders.length}条)</span>
            </h3>

            <div className="space-y-2">
              {orders.map((ord) => {
                const isSelected = ord.id === selectedOrderId;
                
                // State styling badges (same as mobile)
                let statusBg = "bg-slate-800/60 text-slate-400 border-slate-705";
                if (ord.status === OrderStatus.UNASSIGNED) statusBg = "bg-amber-500/15 text-amber-400 border-amber-500/30";
                if (ord.status === OrderStatus.PENDING_ACCEPT) statusBg = "bg-blue-500/15 text-blue-400 border-blue-500/30";
                if (ord.status === OrderStatus.PROCESSING) statusBg = "bg-indigo-500/15 text-indigo-400 border-indigo-500/30";
                if (ord.status === OrderStatus.TIMEOUT) statusBg = "bg-rose-500/15 text-rose-400 border-rose-500/30";
                if (ord.status === OrderStatus.COMPLETED) statusBg = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";

                return (
                  <div
                    key={ord.id}
                    onClick={() => setSelectedOrderId(ord.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition ${isSelected ? "bg-slate-800 border-indigo-500 shadow-md" : "bg-slate-850/60 border-slate-800/80 hover:bg-slate-850"}`}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] font-bold font-mono text-slate-400">{ord.id}</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded border ${statusBg}`}>{ord.status}</span>
                    </div>

                    <h4 className="text-[11px] font-bold text-slate-100 truncate">
                      [{ord.serviceType}] {ord.companyName}
                    </h4>

                    <div className="flex items-center justify-between text-[9px] text-slate-400 mt-2">
                      <p>代表: {ord.contactName}</p>
                      {ord.assignedStaff ? (
                        <p className="text-indigo-300 font-medium">指派: {ord.assignedStaff.name}</p>
                      ) : (
                        <p className="text-amber-300 font-semibold">待分配池</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column: detailed order tracking & escalation controls */}
        <div className="flex-1 bg-slate-900/60 p-5 flex flex-col overflow-y-auto">
          
          {selectedOrder ? (
            <div className="flex-1 flex flex-col justify-between space-y-4">
              
              {/* Order specifications header */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded font-mono font-bold">{selectedOrder.id}</span>
                      <span className="text-[10px] bg-slate-700/60 text-slate-200 px-1.5 rounded">{selectedOrder.source}</span>
                    </div>
                    <h2 className="text-sm font-bold text-indigo-400 mt-1.5">
                      [{selectedOrder.serviceType}] {selectedOrder.productName || "未知设备咨询"}
                    </h2>
                  </div>
                  
                  {/* Immediate workflows relying on statuses */}
                  <div className="flex items-center space-x-2">
                    {/* Accept (专员接单) */}
                    {selectedOrder.status === OrderStatus.PENDING_ACCEPT && (
                      <button
                        onClick={() => onAcceptOrder(selectedOrder.id)}
                        className="py-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold font-sans flex items-center space-x-1 shadow-sm"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>确认接单</span>
                      </button>
                    )}

                    {/* Finish/Complete Order */}
                    {selectedOrder.status === OrderStatus.PROCESSING && (
                      <button
                        onClick={() => onFinishOrder(selectedOrder.id)}
                        className="py-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold flex items-center space-x-1 shadow-sm"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>咨询完结</span>
                      </button>
                    )}

                    {/* Redundant Timeout Action */}
                    {(selectedOrder.status === OrderStatus.PENDING_ACCEPT || selectedOrder.status === OrderStatus.UNASSIGNED) && (
                      <button
                        onClick={() => onTriggerTimeout(selectedOrder.id)}
                        className="py-1 px-2 text-[10px] bg-amber-600 hover:bg-amber-700 text-white rounded font-sans font-bold flex items-center space-x-1"
                        title="仿真触发：派工超时，启动自动二次派单或经理池移交"
                      >
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                        <span>模拟超时派单</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Grid details containing client background */}
                <div className="grid grid-cols-2 gap-3 bg-slate-950/40 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-300 leading-normal">
                  <p><span className="text-slate-500 block mb-0.5">单位全名:</span> <strong className="text-slate-100">{selectedOrder.companyName}</strong></p>
                  <p><span className="text-slate-500 block mb-0.5">所属领域板块:</span> <strong className="text-slate-100">{selectedOrder.industry}</strong></p>
                  <p><span className="text-slate-500 block mb-0.5">客户业务代表:</span> <strong className="text-slate-100">{selectedOrder.contactName} ({selectedOrder.contactPhone})</strong></p>
                  <p><span className="text-slate-500 block mb-0.5">自动指派状态:</span> 
                    {selectedOrder.assignedStaff ? (
                      <strong className="text-indigo-400">已分派 ➜ {selectedOrder.assignedStaff.name} ({selectedOrder.assignedStaff.phone})</strong>
                    ) : (
                      <span className="text-rose-400 font-bold">⚠️ 无空闲专员-人工复审池 ( 谢经理手派 )</span>
                    )}
                  </p>
                  <div className="col-span-2">
                    <span className="text-slate-500 block mb-0.5">客户描述说明:</span>
                    <p className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs italic text-slate-200">
                      "{selectedOrder.description}"
                    </p>
                  </div>
                </div>

                {/* Logs Tracking timeline */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-indigo-400" />
                    <span>系统与专员全生命周期跟进日志</span>
                  </h4>
                  <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 space-y-2 max-h-[160px] overflow-y-auto">
                    {selectedOrder.logs && selectedOrder.logs.map((log, lIdx) => (
                      <div key={lIdx} className="text-[10px] leading-relaxed border-l-2 border-indigo-500 pl-2.5 py-0.5 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200">{log.author}</span>
                          <span className="text-[8px] text-slate-500 font-mono">{new Date(log.time).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-slate-400">{log.content}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Append new跟进 notes form */}
              {selectedOrder.status === OrderStatus.PROCESSING && (
                <form onSubmit={handlePostLogSubmit} className="pt-4 border-t border-slate-800 flex flex-col space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-slate-300">撰写录入新跟进日志:</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-500">模拟撰写角色:</span>
                      <select
                        value={simulatedAuthor}
                        onChange={(e) => setSimulatedAuthor(e.target.value)}
                        className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded border border-slate-700"
                      >
                        <option value={selectedOrder.assignedStaff?.name || "市场客服"}>
                          {selectedOrder.assignedStaff?.name || "市场客服"}
                        </option>
                        <option value="专家实验室">实验中心</option>
                        <option value="系统自动更新">系统自动更新</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="例：“已致电客户，确认本次检测方案。预计下午取件回到实验中心，并建立理化测试流程。”"
                      value={logContent}
                      onChange={(e) => setLogContent(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-hidden focus:border-indigo-400"
                    />
                    <button
                      type="submit"
                      disabled={!logContent.trim()}
                      className={`p-2 rounded-lg flex items-center justify-center transition ${logContent.trim() ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-slate-800 text-slate-600 cursor-not-allowed"}`}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* Completion Satisfaction Card indicators */}
              {selectedOrder.status === OrderStatus.COMPLETED && selectedOrder.evaluation && (
                <div className="bg-slate-950/60 p-3 rounded-xl border border-emerald-950 text-xs">
                  <h4 className="font-bold text-emerald-400 flex items-center space-x-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>该工单客户已经满意度打分测评</span>
                  </h4>
                  <div className="flex items-center space-x-1 text-amber-400 my-1">
                    <span>打分:</span>
                    <span>{"★".repeat(selectedOrder.evaluation.stars)}</span>
                  </div>
                  <p className="text-slate-400 italic">“{selectedOrder.evaluation.feedback || "暂无附言"}”</p>
                </div>
              )}

            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-slate-500 py-20 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                <HelpCircle className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-slate-300">请选择左侧列表中的咨询工单</h4>
                <p className="text-xs text-slate-500 mt-1">
                  选择后可在此处查看全流程的大模型指派状态、理化历史日志、模拟短信通知，并模拟派工超时事件。
                </p>
              </div>
            </div>
          )}

          {/* Core Escalation Engine Rules Diagram Indicator */}
          <div className="mt-5 bg-gradient-to-r from-rose-950/20 to-indigo-950/10 border border-slate-800 rounded-xl p-3.5 text-[10px] text-slate-400 leading-relaxed font-sans">
            <span className="font-bold text-indigo-300 block mb-1">💡 演练提示：超时自动升格规则 (仿真演示)</span>
            <p>
              1. 新工单进入【待接单】。您可点击该工单，右侧会提供一个<strong>【模拟超时派单】</strong>按钮。
            </p>
            <p className="mt-1">
              2. 🚨 <strong>点击第一次</strong>：触发一级超时。引擎判定超时，剥离原顾问、扣减其负载，并<strong>自动指派同专项</strong>其他在岗专员。
            </p>
            <p className="mt-1">
              3. 🚨 <strong>点击第二次</strong>：再次空搁。触发高危升级，状态变为<code>已超时</code>，终止多轮派单，直接升格进入<strong>【谢经理特急人工审批池】</strong>。
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
