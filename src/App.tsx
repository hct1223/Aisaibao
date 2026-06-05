import React, { useState, useEffect } from "react";
import WeChatSimulator from "./components/WeChatSimulator";
import { Order, SupportStaff } from "./types";

export default function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [staffs, setStaffs] = useState<SupportStaff[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync data with Express backend database
  const fetchOrdersAndStaffs = async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (data.orders) {
        setOrders(data.orders);
      }
      if (data.staffs) {
        setStaffs(data.staffs);
      }
    } catch (err) {
      console.error("Error synchronizing backend database:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersAndStaffs();
  }, []);

  // Post new order request
  const handleOrderCreated = async (orderData: any) => {
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData)
      });
      const data = await res.json();
      if (data.success) {
        await fetchOrdersAndStaffs();
      }
    } catch (err) {
      console.error("Error creating order:", err);
    }
  };

  // Dispatch rating feedback
  const handleEvaluateOrder = async (orderId: string, stars: number, feedback: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars, feedback })
      });
      const data = await res.json();
      if (data.success) {
        await fetchOrdersAndStaffs();
      }
    } catch (err) {
      console.error("Error rating order:", err);
    }
  };

  // Dispatch consultant acceptance
  const handleAcceptOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/accept`, {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        await fetchOrdersAndStaffs();
      }
    } catch (err) {
      console.error("Error accepting order:", err);
    }
  };

  // Add a trace log from staff cockpit
  const handleAddLog = async (orderId: string, content: string, author: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, author })
      });
      const data = await res.json();
      if (data.success) {
        await fetchOrdersAndStaffs();
      }
    } catch (err) {
      console.error("Error posting follow-up log:", err);
    }
  };

  // Archiving / finish order
  const handleFinishOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/finish`, {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        await fetchOrdersAndStaffs();
      }
    } catch (err) {
      console.error("Error finishing order:", err);
    }
  };

  // Fast forward simulation of 1-round timeout
  const handleTriggerTimeout = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/timeout`, {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        await fetchOrdersAndStaffs();
      }
    } catch (err) {
      console.error("Error simulating timeout event:", err);
    }
  };

  // Fully reset sandbox database to initial state
  const handleResetDatabase = async () => {
    try {
      const res = await fetch("/api/reset", {
        method: "POST"
      });
      const data = await res.json();
      if (data.status === "success") {
        setOrders(data.orders);
        setStaffs(data.staffs);
      }
    } catch (err) {
      console.error("Database hard reboot failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      
      {/* Top Banner Header */}
      <header className="bg-slate-900 border-b border-indigo-950/40 px-6 py-4 flex flex-wrap items-center justify-between gap-4 z-40">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white flex items-center justify-center font-bold text-lg shadow-md">
            五
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center space-x-2">
              <span>中国工业实验室 · 智能业务建单协同仓 ( 微信小程序客户端 )</span>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-normal px-2 py-0.5 rounded border border-emerald-500/20 font-mono tracking-wider">
                MOBILE DEMO ONLY
              </span>
            </h1>
            <p className="text-[10px] text-slate-400">智能微信对话自动语义建单与客服分流，集成前端高真语音转换（Web Speech API & Fallback）</p>
          </div>
        </div>

        {/* Sandbox Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              if (window.confirm("确认要一键恢复沙箱数据库初始仿真状态吗？")) {
                handleResetDatabase();
              }
            }}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white text-slate-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition duration-150 cursor-pointer"
          >
            <span>重置沙箱</span>
          </button>
        </div>
      </header>

      {/* Main Core Application workspace */}
      <main className="flex-1 p-6 flex flex-col items-center justify-center overflow-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-3 py-20">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400">正在同步赛宝流转沙数据系统...</p>
          </div>
        ) : (
          <div className="w-full max-w-[420px] mx-auto py-2 flex flex-col items-center justify-center">
            <WeChatSimulator
              orders={orders}
              staffs={staffs}
              onOrderCreated={handleOrderCreated}
              onEvaluateOrder={handleEvaluateOrder}
              onTriggerTimeout={handleTriggerTimeout}
              onRefreshOrders={fetchOrdersAndStaffs}
            />
          </div>
        )}
      </main>
    </div>
  );
}
