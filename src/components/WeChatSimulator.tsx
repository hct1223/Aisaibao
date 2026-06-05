import React, { useState, useEffect, useRef } from "react";
import { 
  Phone, ArrowLeft, Search, Bell, FileText, Check, Plus, X, 
  ChevronDown, User, Folder, Building2, Smartphone, Send, 
  MessageSquare, Calendar, Award, BookOpen, Briefcase, ShieldCheck, 
  Image as ImageIcon, Sparkles, Smile, RefreshCw, SendHorizontal, AlertCircle,
  Mic, MicOff, Home, GraduationCap, Clock, ClipboardList, HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ServiceType, OrderStatus, Order, SupportStaff, Appointment, Companion } from "../types";

interface WeChatSimulatorProps {
  orders: Order[];
  staffs: SupportStaff[];
  onOrderCreated: (orderData: any) => void;
  onEvaluateOrder: (orderId: string, stars: number, feedback: string) => void;
  onTriggerTimeout: (orderId: string) => void;
  onRefreshOrders: () => void;
}

export default function WeChatSimulator({
  orders,
  staffs,
  onOrderCreated,
  onEvaluateOrder,
  onTriggerTimeout,
  onRefreshOrders
}: WeChatSimulatorProps) {
  // Navigation State
  const [activeScreen, setActiveScreen] = useState<"home" | "form" | "my-orders" | "appointment-list" | "appointment-form" | "appointment-detail">("home");
  
  // Visitor Reservation State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [isVisitorGuideOpen, setIsVisitorGuideOpen] = useState(false);

  // Visitor Reservation Form Fields
  const [apptHostName, setApptHostName] = useState("徐永亮");
  const [apptVisitTime, setApptVisitTime] = useState("");
  const [apptVisitorName, setApptVisitorName] = useState("");
  const [apptIdCard, setApptIdCard] = useState("");
  const [apptPhone, setApptPhone] = useState("");
  const [apptReason, setApptReason] = useState("业务往来");
  const [apptVehiclePlate, setApptVehiclePlate] = useState("");
  const [apptCompanyName, setApptCompanyName] = useState("");
  const [apptCarriedItems, setApptCarriedItems] = useState("");
  const [apptCompanions, setApptCompanions] = useState<Companion[]>([]);

  // AI Voice and History booking state variables
  const [apptQuickFillText, setApptQuickFillText] = useState("");
  const [isParsingApptQuickFill, setIsParsingApptQuickFill] = useState(false);
  const [isRecordingApptVoice, setIsRecordingApptVoice] = useState(false);
  const [apptQuickFillSuccessMessage, setApptQuickFillSuccessMessage] = useState("");

  const handleApptQuickFill = async () => {
    if (!apptQuickFillText.trim()) {
      alert("请先输入或录入来访描述文本！");
      return;
    }
    setIsParsingApptQuickFill(true);
    setApptQuickFillSuccessMessage("");
    try {
      const res = await fetch("/api/appointments/ai-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: apptQuickFillText })
      });
      const result = await res.json();
      if (result.success && result.data) {
        const item = result.data;
        if (item.hostName) setApptHostName(item.hostName);
        if (item.visitTime) setApptVisitTime(item.visitTime);
        if (item.visitorName) setApptVisitorName(item.visitorName);
        if (item.idCard) setApptIdCard(item.idCard);
        if (item.phone) setApptPhone(item.phone);
        if (item.reason) setApptReason(item.reason);
        if (item.vehiclePlate) setApptVehiclePlate(item.vehiclePlate);
        if (item.companyName) setApptCompanyName(item.companyName);
        if (item.carriedItems) setApptCarriedItems(item.carriedItems);
        if (item.companions) {
          setApptCompanions(item.companions);
        } else {
          setApptCompanions([]);
        }

        setApptQuickFillSuccessMessage(
          `✨ AI语音/文本一键识别成功！${result.isSimulated ? "(规则备用算法解析完毕)" : "(Gemini 大模型智能提取并已回填)"}`
        );
        setTimeout(() => setApptQuickFillSuccessMessage(""), 6000);
      } else {
        alert("AI 解析失败，请重试或简化您的文本。");
      }
    } catch (err) {
      console.error("AI Quick Fill error:", err);
      alert("网络服务繁忙，调用AI解析失败。");
    } finally {
      setIsParsingApptQuickFill(false);
    }
  };

  // Extract unique past bookings from current historical appointments array
  const getUniquePastVisitors = () => {
    const seen = new Set<string>();
    const list: Appointment[] = [];
    for (const apt of appointments) {
      if (!apt.visitorName) continue;
      const key = `${apt.visitorName}_${apt.phone}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push(apt);
      }
    }
    return list.slice(0, 4); // Top 4 history visitor records
  };

  const applyHistoricalVisitor = (apt: Appointment) => {
    if (apt.visitorName) setApptVisitorName(apt.visitorName);
    if (apt.idCard) setApptIdCard(apt.idCard);
    if (apt.phone) setApptPhone(apt.phone);
    if (apt.companyName) setApptCompanyName(apt.companyName);
    if (apt.vehiclePlate) setApptVehiclePlate(apt.vehiclePlate);
    if (apt.carriedItems) setApptCarriedItems(apt.carriedItems || "");
    if (apt.reason) setApptReason(apt.reason);
    if (apt.companions) {
      setApptCompanions(apt.companions);
    } else {
      setApptCompanions([]);
    }
    setApptQuickFillSuccessMessage(`📋 成功读取历史记录：【${apt.visitorName}】的信息及同行人员已一键完成复刻代入！请填选访问时间并直接预约。`);
    setTimeout(() => setApptQuickFillSuccessMessage(""), 6000);
  };

  const fetchAppointments = async () => {
    setIsLoadingAppointments(true);
    try {
      const res = await fetch("/api/appointments");
      if (!res.ok) {
        throw new Error(`请求失败：HTTP ${res.status}`);
      }
      const ct = res.headers.get("content-type");
      if (!ct || !ct.includes("application/json")) {
        throw new Error("服务端返回了非 JSON 格式的响应（例如 HTML 页面）。请检查服务端状态。");
      }
      const data = await res.json();
      if (data && data.appointments) {
        setAppointments(data.appointments);
      }
    } catch (err: any) {
      console.error("Error fetching appointments:", err);
    } finally {
      setIsLoadingAppointments(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [activeScreen]);
  
  // Tab within My Orders page
  // 'all' | 'pending' | 'processing' | 'review' | 'completed' + timedout is visible in all/timeout states
  const [activeOrderTab, setActiveOrderTab] = useState<string>("all");

  // Multi-turn Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatToken] = useState(() => Math.random().toString(36).substring(7));
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "ai"; content: string; time: string; attachment?: string }>>([
    {
      sender: "ai",
      content: "您好！我是中国工业实验室（赛宝实验室）「AI全能客服专家」🤖！我已加载实验室全业务领域知识库与智能分派大脑。\n\n我在此为您提供本平台核心业务的全生命周期支持，包括：\n\n🏢 **一、业务介绍** - 实验室CNAS/CMA国家级双重资质及悠久背景介绍\n💡 **二、业务咨询** - 集成芯片测试、高阶理化检测项目与阶梯收费测算方案\n📅 **三、来访预约** - 入所须知、闸机白名单比对报备及注意事项指引\n🔍 **四、委托进度查询** - 快速校验且精准播报您名下的工单最新状态与工程师日志\n🎓 **五、线下培训** - 2026年度实验室质量体系内审、芯片失效分析高阶班学费与课程详情\n📚 **六、专题解读** - 精准解读 ISO/IEC 17025、车规AEC-Q100及欧盟RoHS限值最新标准\n📰 **七、新闻动态** - 实时同步最新的5米车用电磁兼容暗室落成及百强喜报等资讯成果\n📝 **八、智能申报建单** - 口语化告知您的公司、联系人及检测需求，即可免表单自动立案派单！\n\n💬 您可以直接向我发送任何相关业务问题，或点击下方的【快捷功能栏】即刻进行闪电式全生命周期问答！",
      time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [extractedStatus, setExtractedStatus] = useState<any>({
    companyName: "",
    industry: "",
    contactName: "",
    contactPhone: "",
    description: "",
    serviceType: ""
  });

  // Native Form Fields
  const [formServiceType, setFormServiceType] = useState<ServiceType>(ServiceType.PENDING);
  const [formProductName, setFormProductName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCompanyName, setFormCompanyName] = useState("");
  const [formIndustry, setFormIndustry] = useState("电子通信");
  const [formContactName, setFormContactName] = useState("");
  const [formContactPhone, setFormContactPhone] = useState("");
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const [formAttachment, setFormAttachment] = useState<string | null>(null);

  // Form AI Auto-fill Dialog state
  const [isQuickFillOpen, setIsQuickFillOpen] = useState(false);
  const [quickFillText, setQuickFillText] = useState("");
  const [isParsingQuickFill, setIsParsingQuickFill] = useState(false);
  const [isRecordingOrderVoice, setIsRecordingOrderVoice] = useState(false);
  const [orderSpeechError, setOrderSpeechError] = useState<string | null>(null);

  // User Evaluation Modal
  const [evaluatingOrderId, setEvaluatingOrderId] = useState<string | null>(null);
  const [evalStars, setEvalStars] = useState(5);
  const [evalFeedback, setEvalFeedback] = useState("");

  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isAiTyping, isChatOpen]);

  // Form input validation helper
  const isFormValid = formDescription.trim() && formCompanyName.trim() && formContactName.trim() && formContactPhone.trim();

  // Handle standard submit button
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    onOrderCreated({
      companyName: formCompanyName,
      industry: formIndustry,
      contactName: formContactName,
      contactPhone: formContactPhone,
      productName: formProductName,
      description: formDescription,
      serviceType: formServiceType,
      source: "手动新建",
      attachments: formAttachment ? [formAttachment] : []
    });

    // Reset Form
    setFormCompanyName("");
    setFormContactName("");
    setFormContactPhone("");
    setFormProductName("");
    setFormDescription("");
    setFormServiceType(ServiceType.PENDING);
    setFormAttachment(null);

    // Swap to consult screen
    setActiveScreen("my-orders");
    setActiveOrderTab("pending");
  };

  const handleAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apptVisitorName.trim() || !apptPhone.trim() || !apptIdCard.trim() || !apptCompanyName.trim()) {
      alert("请填写完整的访客必填项（来访者姓名、身份证、手机号、公司名称）");
      return;
    }

    try {
      const formattedCompanions = apptCompanions.filter(c => c.name.trim() && c.phone.trim() && c.idCard.trim());

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostName: apptHostName,
          visitTime: apptVisitTime ? apptVisitTime : new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).replace(/\//g, "-"),
          visitorName: apptVisitorName,
          idCard: apptIdCard,
          phone: apptPhone,
          reason: apptReason,
          vehiclePlate: apptVehiclePlate,
          companyName: apptCompanyName,
          carriedItems: apptCarriedItems,
          companions: formattedCompanions
        })
      });
      const data = await res.json();
      if (data.success) {
        setApptHostName("徐永亮");
        setApptVisitTime("");
        setApptVisitorName("");
        setApptIdCard("");
        setApptPhone("");
        setApptReason("业务往来");
        setApptVehiclePlate("");
        setApptCompanyName("");
        setApptCarriedItems("");
        setApptCompanions([]);
        
        await fetchAppointments();
        setActiveScreen("appointment-list");
      } else {
        alert("新增预约失败：" + (data.message || "未知错误"));
      }
    } catch (err) {
      console.error("Error creating visitor appointment:", err);
      alert("网络错误，添加预约失败");
    }
  };

  const handleQuickRebook = async (apt: Appointment, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent card click from toggling detail screen
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostName: apt.hostName || "徐永亮",
          visitTime: todayStr,
          visitorName: apt.visitorName,
          idCard: apt.idCard,
          phone: apt.phone,
          reason: apt.reason || "业务往来",
          vehiclePlate: apt.vehiclePlate || "",
          companyName: apt.companyName || "",
          carriedItems: apt.carriedItems || "",
          companions: apt.companions || []
        })
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const ct = res.headers.get("content-type");
      if (!ct || !ct.includes("application/json")) {
        throw new Error("服务端返回了非 JSON 格式的响应。请检查服务端状态。");
      }
      const data = await res.json();
      if (data && data.success) {
        alert(`🎉 再次预约成功！已直接在今天 (${todayStr}) 为您生成全新的访客预约单。`);
        await fetchAppointments();
        setActiveScreen("appointment-list");
      } else {
        alert("再次预约失败：" + ((data && data.message) || "未知错误"));
      }
    } catch (err: any) {
      console.error("Error creating quick rebook from history:", err);
      alert("网络故障，再次预约请求失败，请稍后重试。详情: " + err.message);
    }
  };

  // Perform AI Parse of Raw Paragraph
  const triggerAiQuickFill = async () => {
    if (!quickFillText.trim()) return;
    setIsParsingQuickFill(true);

    try {
      const res = await fetch("/api/orders/ai-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: quickFillText })
      });
      const resData = await res.json();
      if (resData.success && resData.data) {
        const payload = resData.data;
        // Auto-fill React state
        if (payload.companyName) setFormCompanyName(payload.companyName);
        if (payload.industry) setFormIndustry(payload.industry);
        if (payload.contactName) setFormContactName(payload.contactName);
        if (payload.contactPhone) setFormContactPhone(payload.contactPhone);
        if (payload.productName) setFormProductName(payload.productName);
        if (payload.description) setFormDescription(payload.description);
        if (payload.serviceType) {
          // Normalize service type string to enum
          const matched = Object.values(ServiceType).find(v => v === payload.serviceType);
          setFormServiceType(matched || ServiceType.PENDING);
        }

        setIsQuickFillOpen(false);
        setQuickFillText("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsParsingQuickFill(false);
    }
  };

  // Multi-turn Chat Send Routine
  const handleSendChat = async (customText?: string) => {
    const textToSend = customText !== undefined ? customText : chatInput;
    if (!textToSend.trim()) return;

    const userText = textToSend;
    setChatMessages(prev => [...prev, {
      sender: "user",
      content: userText,
      time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
    }]);
    if (customText === undefined) {
      setChatInput("");
    }
    setIsAiTyping(true);

    try {
      // Check if it looks like a progress inquiry, e.g. "我的进度", "查询进度", "订单怎么回事"
      const lowerText = userText.toLowerCase();
      const isProgressQuery = 
        lowerText.includes("进度") || 
        lowerText.includes("处理到") || 
        lowerText.includes("跟进情况") || 
        lowerText.includes("我的咨询") ||
        lowerText.includes("进展") ||
        lowerText.includes("情况");

      if (isProgressQuery) {
        const res = await fetch("/api/orders/progress-query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ queryText: userText })
        });
        const resData = await res.json();
        setChatMessages(prev => [...prev, {
          sender: "ai",
          content: resData.text,
          time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
        }]);
        setIsAiTyping(false);
        return;
      }

      // Normal order-taking conversational dialogue flow
      // Gather dialogue history
      const history = chatMessages.slice(-8).map(m => ({
        sender: m.sender,
        content: m.content
      }));
      history.push({ sender: "user", content: userText });

      const res = await fetch("/api/orders/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken: chatToken,
          messages: history
        })
      });

      const resData = await res.json();
      
      setChatMessages(prev => [...prev, {
        sender: "ai",
        content: resData.text,
        time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
      }]);

      if (resData.extractedFields) {
        setExtractedStatus(resData.extractedFields);
      }

      // If AI outputted custom order generation indicator
      if (resData.action === "CREATE_ORDER" || resData.text.includes("【自动建单】")) {
        // Trigger parent state refetch because a new order is spawned
        setTimeout(() => {
          onRefreshOrders();
        }, 1200);
      }

    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, {
        sender: "ai",
        content: "系统有点断开，但已经自动拦截并重新匹配。请告知您的电话，以便后台指派顾问给您回电。",
        time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
      }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const openChatWithQuery = (queryText: string) => {
    setIsChatOpen(true);
    setExtractedStatus({
      companyName: "",
      industry: "",
      contactName: "",
      contactPhone: "",
      description: "",
      serviceType: ""
    });
    // Set a minor timeout to ensure the state updates or typing effect registers elegantly
    setTimeout(() => {
      handleSendChat(queryText);
    }, 100);
  };

  // Start front-end Web Speech API speech recognition
  const startSpeechRecognition = () => {
    if (isRecording) {
      // Toggle off if clicking while active
      setIsRecording(false);
      return;
    }

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setSpeechError("运行环境限制：已为您切入【高精度语音录音模拟演示】。");
      setIsRecording(true);
      
      const mockPhrases = [
        "我是广州赛宝汽车芯片技术部的刘专员，想申请做工规级主板的主成分可靠性振动测试，电话是13988887777",
        "您好，我们公司在深圳，需要一站式化学实验室耐磨性能测试和CCC防爆资质认证开发辅导反馈，我的代表电话是13600002222",
        "我是比亚迪新能源事业部的王工，想要加急定制大剪切拉伸力学性能试验和热学可靠度循环测试，手机15900008888"
      ];
      const randomPhrase = mockPhrases[Math.floor(Math.random() * mockPhrases.length)];
      
      // Clear current input and type slowly
      setChatInput("");
      let currentIdx = 0;
      const interval = setInterval(() => {
        setIsRecording(prev => {
          if (!prev) {
            // Cancelled
            clearInterval(interval);
            return false;
          }
          if (currentIdx < randomPhrase.length) {
            setChatInput(randomPhrase.substring(0, currentIdx + 1));
            currentIdx++;
            return true;
          } else {
            clearInterval(interval);
            return false;
          }
        });
      }, 50);
      return;
    }

    try {
      const recog = new SpeechRecognitionClass();
      recog.lang = "zh-CN";
      recog.continuous = false;
      recog.interimResults = false;

      recog.onstart = () => {
        setIsRecording(true);
        setSpeechError(null);
      };

      recog.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setChatInput(prev => prev + transcript);
        }
      };

      recog.onerror = (event: any) => {
        console.error("Speech Recognition Error Type:", event.error);
        
        // IFrame security sandbox or denied permission fallback
        if (event.error === "not-allowed" || event.error === "service-not-allowed" || event.error === "aborted") {
          setSpeechError("权限限制，已无缝切换至【高保真语音录音模拟器】。");
          
          const mockPhrases = [
            "我是深圳中兴终端安全部的马经理，想要做一个新物料防尘抗摔物理极限可靠度鉴定，手机15099998888",
            "你好，我们想做一款电磁式热敏传感器模块的性能检验，我的单位是珠海格力测试室，联系方式13377778888"
          ];
          const randomPhrase = mockPhrases[Math.floor(Math.random() * mockPhrases.length)];
          
          setChatInput("");
          let currentIdx = 0;
          const interval = setInterval(() => {
            setIsRecording(prev => {
              if (!prev) {
                clearInterval(interval);
                return false;
              }
              if (currentIdx < randomPhrase.length) {
                setChatInput(randomPhrase.substring(0, currentIdx + 1));
                currentIdx++;
                return true;
              } else {
                clearInterval(interval);
                return false;
              }
            });
          }, 50);
        } else {
          setSpeechError(`拾音异常: ${event.error}`);
          setIsRecording(false);
        }
      };

      recog.onend = () => {
        setIsRecording(false);
      };

      recog.start();
    } catch (err: any) {
      console.error(err);
      setSpeechError("启动语音拾音失败");
      setIsRecording(false);
    }
  };

  const startOrderSpeechRecognition = () => {
    if (isRecordingOrderVoice) {
      setIsRecordingOrderVoice(false);
      return;
    }

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setOrderSpeechError("环境限制，已为您切入【高精度语音录音模拟演示】。");
      setIsRecordingOrderVoice(true);
      
      const mockPhrases = [
        "我是广州赛宝材料科技中心的李主任，电话是13511112222，研发了一款耐热塑胶，近期想加急做一个大剪切形变拉力理化可靠性及耐磨损性能测试，行业属于智能新物料制造。",
        "你好，我们是深圳大疆创新采购部的张组长，想对最新的无人机主控板芯片组件进行材料级热冲击循环及元器件极限应力测试，我手机是13822223333。",
        "我是上海汽车芯片研究中心的主管，想申请对一款高频元器件接收端模块做一站式ISO26262评估与CCC认证开发辅导。联系电话是18655554444，拜托了。"
      ];
      const randomPhrase = mockPhrases[Math.floor(Math.random() * mockPhrases.length)];
      
      setQuickFillText("");
      let currentIdx = 0;
      const interval = setInterval(() => {
        setIsRecordingOrderVoice(prev => {
          if (!prev) {
            clearInterval(interval);
            return false;
          }
          if (currentIdx < randomPhrase.length) {
            setQuickFillText(randomPhrase.substring(0, currentIdx + 1));
            currentIdx++;
            return true;
          } else {
            clearInterval(interval);
            return false;
          }
        });
      }, 50);
      return;
    }

    try {
      const recog = new SpeechRecognitionClass();
      recog.lang = "zh-CN";
      recog.continuous = false;
      recog.interimResults = false;

      recog.onstart = () => {
        setIsRecordingOrderVoice(true);
        setOrderSpeechError(null);
      };

      recog.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setQuickFillText(prev => prev + transcript);
        }
      };

      recog.onerror = (event: any) => {
        console.error("Order Speech Recognition Error Type:", event.error);
        
        if (event.error === "not-allowed" || event.error === "service-not-allowed" || event.error === "aborted") {
          setOrderSpeechError("权限限制，已为您无缝切换至【高精度智能语音模拟器】。");
          
          const mockPhrases = [
            "我是小米汽车动力部的林工，想要对一款车载合金材料的最高抗拉拉伸极限做检验检测。手机号码是13944445555。",
            "我们公司叫杭州阿里达摩院。开发一款新型智能计算模块。想申请一下元器件失效性分析和大模型跑通检验，联系手机18899990000。"
          ];
          const randomPhrase = mockPhrases[Math.floor(Math.random() * mockPhrases.length)];
          
          setQuickFillText("");
          let currentIdx = 0;
          const interval = setInterval(() => {
            setIsRecordingOrderVoice(prev => {
              if (!prev) {
                clearInterval(interval);
                return false;
              }
              if (currentIdx < randomPhrase.length) {
                setQuickFillText(randomPhrase.substring(0, currentIdx + 1));
                currentIdx++;
                return true;
              } else {
                clearInterval(interval);
                return false;
              }
            });
          }, 50);
        } else {
          setOrderSpeechError(`拾音异常: ${event.error}`);
          setIsRecordingOrderVoice(false);
        }
      };

      recog.onend = () => {
        setIsRecordingOrderVoice(false);
      };

      recog.start();
    } catch (err: any) {
      console.error(err);
      setOrderSpeechError("启动语音拾音失败");
      setIsRecordingOrderVoice(false);
    }
  };

  const handleEvaluateSubmit = () => {
    if (!evaluatingOrderId) return;
    onEvaluateOrder(evaluatingOrderId, evalStars, evalFeedback);
    setEvaluatingOrderId(null);
    setEvalFeedback("");
    setEvalStars(5);
  };

  // Mock upload attachments base64 string
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setFormAttachment(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Filter orders depending on current mobile tabs
  const getFilteredOrders = () => {
    switch (activeOrderTab) {
      case "pending":
        return orders.filter(o => o.status === OrderStatus.UNASSIGNED || o.status === OrderStatus.PENDING_ACCEPT);
      case "processing":
        return orders.filter(o => o.status === OrderStatus.PROCESSING || o.status === OrderStatus.TIMEOUT);
      case "review":
        return orders.filter(o => o.status === OrderStatus.PENDING_REVIEW);
      case "completed":
        return orders.filter(o => o.status === OrderStatus.COMPLETED);
      default:
        return orders;
    }
  };

  return (
    <div className="relative w-full max-w-[420px] mx-auto bg-slate-950 rounded-[40px] border-[10px] border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] overflow-hidden font-sans text-slate-800 flex flex-col h-[820px]">
      
      {/* Phone Status Grid Banner Top */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 text-white px-6 pt-3 pb-2 flex justify-between items-center text-xs select-none relative z-10">
        <span className="font-semibold font-sans tracking-tight">11:21 ⏰</span>
        <div className="absolute left-1/2 transform -translate-x-1/2 w-28 h-4 bg-black rounded-b-xl -top-1" />
        <div className="flex items-center space-x-1.5 opacity-90">
          <span className="text-[10px] bg-indigo-500/30 px-1 rounded border border-indigo-400/20 text-indigo-200">5G</span>
          <div className="w-4 h-2.5 bg-current rounded-sm opacity-80" />
        </div>
      </div>

      {/* Primary Simulator Screen Router */}
      <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col relative">
        <AnimatePresence mode="wait">
          
          {/* SCREEN 1: Mini-Program Default Home (服务大厅) */}
          {activeScreen === "home" && (
            <motion.div
              id="mp-home-screen"
              key="home"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-grow flex flex-col pb-20"
            >
              {/* Header Navigation Logo */}
              <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">赛</div>
                  <span className="font-bold text-slate-900 text-sm tracking-tight">中国赛宝工业实验室门户</span>
                </div>
                <div className="flex items-center space-x-1.5 bg-slate-100 px-2.5 py-1 rounded-full text-slate-700 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px]">服务可用</span>
                </div>
              </div>

              {/* Fake Search Tool Section */}
              <div className="px-4 py-2.5 bg-white border-b border-slate-100">
                <div className="bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 flex items-center justify-between text-slate-400 text-xs">
                  <div className="flex items-center space-x-2">
                    <Search className="w-3.5 h-3.5" />
                    <span>课程 / 赛宝观点 / 专家咨询...</span>
                  </div>
                  <Bell className="w-3.5 h-3.5 text-slate-300" />
                </div>
              </div>

              {/* Dynamic Categories Carousel Banner */}
              <div className="p-4">
                <div className="relative rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-700 text-white p-4 overflow-hidden shadow-md">
                  <div className="absolute right-0 bottom-0 translate-x-5 translate-y-5 opacity-10">
                    <Award className="w-40 h-40" />
                  </div>
                  <div className="relative z-10 flex flex-col max-w-[65%]">
                    <span className="text-[10px] bg-white/20 text-indigo-100 font-semibold uppercase px-1.5 py-0.5 rounded self-start mb-2 tracking-wider">业务大通配</span>
                    <h3 className="font-bold text-sm tracking-tight text-white mb-1">电子信息检测与认证</h3>
                    <p className="text-[10px] text-indigo-100 leading-tight">70000+智能专家团队 深度提供一站式可靠性跟进、材料化验。卓越品质65年深耕厚积。</p>
                  </div>
                  <div className="mt-4 flex items-center space-x-2">
                    <span className="text-[9px] bg-emerald-500/90 text-white px-2 py-0.5 rounded-full">电话热线</span>
                    <span className="text-[10px] font-mono text-indigo-100">020-87236881</span>
                  </div>
                </div>
              </div>

              {/* Standard 8-grid Navigation menu buttons */}
              <div className="px-4 py-2">
                <div className="grid grid-cols-4 gap-y-4 gap-x-2 bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <button className="flex flex-col items-center select-none hover:opacity-85 transition cursor-pointer" onClick={() => openChatWithQuery("请进行业务介绍，讲解词包括实验室建立年份、资质、宗旨背景")}>
                    <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mb-1">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] text-slate-600 font-medium font-sans">业务介绍</span>
                  </button>
                  <button className="flex flex-col items-center select-none hover:opacity-85 transition cursor-pointer" onClick={() => openChatWithQuery("请问有哪些主要的测试项目和业务咨询范围？你们是如何收费测算的？")}>
                    <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-1">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] text-slate-600 font-medium font-sans">业务咨询</span>
                  </button>
                  <button className="flex flex-col items-center select-none hover:opacity-85 transition cursor-pointer" onClick={() => setActiveScreen("form")}>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1 relative">
                      <MessageSquare className="w-5 h-5" />
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border border-white" />
                    </div>
                    <span className="text-[11px] text-slate-800 font-bold font-sans">智能申报</span>
                  </button>
                  <button className="flex flex-col items-center select-none hover:opacity-85 transition cursor-pointer" onClick={() => setActiveScreen("appointment-list")}>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1 relative shadow-xs">
                      <Calendar className="w-5 h-5 animate-pulse-slow" />
                      <span className="absolute -top-1 -right-1 w-2 w-2 bg-emerald-500 rounded-full border border-white" />
                    </div>
                    <span className="text-[11px] text-slate-800 font-bold font-sans">来访预约</span>
                  </button>

                  <button className="flex flex-col items-center select-none hover:opacity-85 transition cursor-pointer" onClick={() => openChatWithQuery("请进行专题解读，主要讲解ISO/IEC 17025、车规级AEC-Q100及RoHS标准要求")}>
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-1">
                      <Folder className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] text-slate-600 font-medium">专题解读</span>
                  </button>
                  <button className="flex flex-col items-center select-none hover:opacity-85 transition cursor-pointer" onClick={() => openChatWithQuery("我想实时检索并查询我名下的委托订单最新状态和进度跟进日志！")}>
                    <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center mb-1">
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] text-slate-600 font-medium">委托查询</span>
                  </button>
                  <button className="flex flex-col items-center select-none hover:opacity-85 transition cursor-pointer" onClick={() => openChatWithQuery("我想了解2026年近期线下高阶精品培训班开班计划与学费标准")}>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] text-slate-600 font-medium">线下培训</span>
                  </button>
                  <button className="flex flex-col items-center select-none hover:opacity-85 transition cursor-pointer" onClick={() => openChatWithQuery("请帮我进行最新新闻动态播报，播报暗室设备落成及本月重大突破")}>
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-1">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] text-slate-600 font-medium">新闻动态</span>
                  </button>
                </div>
              </div>

              {/* News Banners and Content list */}
              <div className="px-4 py-2 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-900 border-l-3 border-indigo-600 pl-1.5">赛宝最新动态</h4>
                  <span className="text-[10px] text-indigo-600">全部动态 &gt;</span>
                </div>
                
                <div className="space-y-2.5">
                  <div 
                    onClick={() => openChatWithQuery("请简要播报国家测试专家入驻及十五五精尖规划的最新解读与新闻")}
                    className="bg-white rounded-xl p-3 border border-slate-100 flex space-x-3 shadow-none hover:shadow-xs transition duration-150 cursor-pointer active:scale-98"
                  >
                    <div className="flex-1">
                      <h5 className="font-bold text-xs text-slate-800 leading-snug line-clamp-2 hover:text-indigo-650 transition">广东新闻联播 | 电子五所国家级测试专家科学入驻并详细解读广东「十五五」精尖规划发展</h5>
                      <span className="text-[9px] text-slate-400 mt-1 block">2026-06-02 10:47</span>
                    </div>
                    <div className="w-20 h-14 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                      <img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=120&h=80" alt="news" className="w-full h-full object-cover" />
                    </div>
                  </div>

                  <div 
                    onClick={() => openChatWithQuery("请简要播报赛宝认证公司全票入选广州市第一批产业集群骨干名录的动态新闻")}
                    className="bg-white rounded-xl p-3 border border-slate-100 flex space-x-3 shadow-none hover:shadow-xs transition duration-150 cursor-pointer active:scale-98"
                  >
                    <div className="flex-1">
                      <h5 className="font-bold text-xs text-slate-800 leading-snug line-clamp-2 hover:text-indigo-650 transition">赛宝认证公司全票入选广州市智能制造第一批骨干型产业集群体系名单</h5>
                      <span className="text-[9px] text-slate-400 mt-1 block">2026-06-02 10:41</span>
                    </div>
                    <div className="w-20 h-14 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                      <img src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=120&h=80" alt="news" className="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* SCREEN 2: Consulting Form Submission Page (咨询详情录入页) */}
          {activeScreen === "form" && (
            <motion.div
              id="mp-form-screen"
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-grow flex flex-col pb-20 bg-slate-50"
            >
              <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center space-x-2">
                <button onClick={() => setActiveScreen("home")} className="text-slate-600 hover:text-slate-900">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1">
                  <h3 className="font-bold text-sm text-slate-900">业务咨询信息填写</h3>
                </div>
              </div>

              {/* Form header warning banner */}
              <div className="bg-sky-50 px-4 py-3 border-b border-sky-100 flex items-start space-x-3">
                <div className="w-6 h-6 rounded-lg bg-sky-500 text-white flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-sky-950">智能辅助填写可用</h4>
                  <p className="text-[10px] text-sky-800">直接将一句话文本描述贴入AI窗口，即可全自动回填表单字段！</p>
                </div>
              </div>

              {/* Prominent Form AI trigger */}
              <div className="px-4 pt-4 pb-2">
                <button
                  type="button"
                  id="form-top-ai-btn"
                  onClick={() => setIsQuickFillOpen(true)}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:from-blue-700 hover:to-indigo-700 flex items-center justify-center space-x-2 transition duration-150 animate-pulse"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>✨ AI智能快速建单（一句话生成工单）</span>
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
                
                {/* PART A: Service information */}
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-3">
                  <div className="border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-bold text-slate-900">咨询需求详细内容</h4>
                  </div>

                  {/* Dropdown Selector */}
                  <div className="relative">
                    <label className="block text-[11px] text-slate-500 mb-1.5 font-bold">服务类型 <span className="text-rose-500">*</span></label>
                    <button
                      type="button"
                      onClick={() => setIsServiceDropdownOpen(!isServiceDropdownOpen)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between text-xs hover:border-indigo-400 transition"
                    >
                      <span>{formServiceType}</span>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </button>
                    
                    {isServiceDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-20">
                        {Object.values(ServiceType).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => {
                              setFormServiceType(st);
                              setIsServiceDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 border-b border-slate-100 text-slate-700 last:border-0 font-medium"
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Product name field */}
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1 font-bold">产品/项目名称</label>
                    <input
                      type="text"
                      placeholder="请填写具体咨询的产品项目名（可选）"
                      value={formProductName}
                      onChange={(e) => setFormProductName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>

                  {/* Description textarea */}
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1 font-bold">业务咨询描述 <span className="text-rose-500">*</span></label>
                    <textarea
                      rows={3}
                      placeholder="请简要叙述您的测试目标、技术规格，包含任何所需的服务环境和指标要求（必填）"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-hidden resize-none"
                    />
                  </div>

                  {/* Simple upload attachment mockup */}
                  <div>
                    <span className="block text-[11px] text-slate-500 mb-1.5 font-bold">上传资料图片</span>
                    <div className="flex items-center space-x-3">
                      <label className="w-14 h-14 rounded-xl bg-slate-50 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 text-slate-400 hover:text-indigo-500 transition">
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                        <ImageIcon className="w-4 h-4" />
                        <span className="text-[8px] mt-1 font-bold">照片/资料</span>
                      </label>
                      {formAttachment ? (
                        <div className="relative w-14 h-14 rounded-xl border border-slate-200 overflow-hidden">
                          <img src={formAttachment} alt="thumbnail" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setFormAttachment(null)}
                            className="absolute top-0 right-0 w-4 h-4 bg-rose-500 text-white rounded-bl flex items-center justify-center hover:bg-rose-600"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">仅限专员及您本人可见</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* PART B: Contact details */}
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-3">
                  <div className="border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-bold text-slate-900">联系方式及公司背景</h4>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1 font-bold">公司/单位名称 <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      placeholder="请填写贵司的完整企业名称（例：深圳华为等）"
                      value={formCompanyName}
                      onChange={(e) => setFormCompanyName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1 font-bold">所属研究行业 <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        placeholder="通用信息技术"
                        value={formIndustry}
                        onChange={(e) => setFormIndustry(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1 font-bold">联系人姓名 <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        placeholder="请填写尊称"
                        value={formContactName}
                        onChange={(e) => setFormContactName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1 font-bold">手机号码 <span className="text-rose-500">*</span></label>
                    <input
                      type="tel"
                      placeholder="请填写11位手机号"
                      value={formContactPhone}
                      onChange={(e) => setFormContactPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>
                </div>

                <div className="pb-4">
                  <button
                    type="submit"
                    disabled={!isFormValid}
                    className={`w-full py-3 text-white text-xs font-bold rounded-xl shadow-md transition duration-150 ${isFormValid ? "bg-indigo-600 hover:bg-indigo-700" : "bg-slate-300 cursor-not-allowed"}`}
                  >
                    立即提交业务工单
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* SCREEN 3: My Consultations List (工单历史管理页) */}
          {activeScreen === "my-orders" && (
            <motion.div
              id="mp-orders-screen"
              key="my-orders"
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="flex-grow flex flex-col pb-20 bg-slate-100"
            >
              <div className="bg-white px-4 py-3 border-b border-slate-200 flex items-center space-x-2">
                <button onClick={() => setActiveScreen("home")} className="text-slate-600 hover:text-slate-900">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1">
                  <h3 className="font-bold text-sm text-slate-900">我的咨询流转跟踪</h3>
                </div>
              </div>

              {/* Mini Tabs for Filters */}
              <div className="bg-white border-b border-slate-200 flex text-center">
                {[
                  { id: "all", label: "全部" },
                  { id: "pending", label: "待分配" },
                  { id: "processing", label: "已接单" },
                  { id: "review", label: "待评价" },
                  { id: "completed", label: "已完结" }
                ].map((tb) => (
                  <button
                    key={tb.id}
                    onClick={() => setActiveOrderTab(tb.id)}
                    className={`flex-1 py-3 text-[11px] font-bold border-b-2 transition ${activeOrderTab === tb.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500"}`}
                  >
                    {tb.label}
                  </button>
                ))}
              </div>

              {/* Consultation List contents */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {getFilteredOrders().length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
                      <FileText className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">暂无相关工单记录</p>
                      <button onClick={() => setActiveScreen("form")} className="mt-2 text-xs text-indigo-600 font-bold underline">立即创建一个</button>
                    </div>
                  </div>
                ) : (
                  getFilteredOrders().map((ord) => {
                    // Status styling
                    let badgeColor = "bg-slate-100 text-slate-600 border-slate-200";
                    if (ord.status === OrderStatus.UNASSIGNED) badgeColor = "bg-amber-50 text-amber-600 border-amber-200";
                    if (ord.status === OrderStatus.PENDING_ACCEPT) badgeColor = "bg-blue-50 text-blue-600 border-blue-200";
                    if (ord.status === OrderStatus.PROCESSING) badgeColor = "bg-indigo-50 text-indigo-600 border-indigo-200";
                    if (ord.status === OrderStatus.TIMEOUT) badgeColor = "bg-rose-50 text-rose-600 border-rose-200";
                    if (ord.status === OrderStatus.PENDING_REVIEW) badgeColor = "bg-purple-100 text-purple-700 border-purple-200";
                    if (ord.status === OrderStatus.COMPLETED) badgeColor = "bg-emerald-50 text-emerald-600 border-emerald-200";

                    return (
                      <div key={ord.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs relative overflow-hidden">
                        
                        {/* Ribbon source tag */}
                        <div className="absolute top-0 right-0 text-[8px] px-2 bg-slate-200 text-slate-600 font-sans tracking-wide rounded-bl">
                          {ord.source}
                        </div>

                        {/* Top Identification and status bar */}
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-mono text-xs font-bold text-slate-600">{ord.id}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>{ord.status}</span>
                        </div>

                        {/* Card metadata details */}
                        <h4 className="font-bold text-xs text-slate-800 leading-tight mb-2">
                          [{ord.serviceType}] {ord.productName || "泛材料化验咨询"}
                        </h4>

                        <div className="space-y-1 text-[10px] text-slate-600 border-b border-slate-100 pb-3 mb-3">
                          <p><span className="text-slate-400">单位：</span>{ord.companyName}</p>
                          <p><span className="text-slate-400">联系人：</span>{ord.contactName} ({ord.contactPhone})</p>
                          <p className="line-clamp-2"><span className="text-slate-400">需求：</span>{ord.description}</p>
                        </div>

                        {/* Immediate consultant cards (with Instant touch base messaging matching criteria section 5) */}
                        {ord.assignedStaff ? (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start space-x-3 mb-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 flex-shrink-0">
                              <img src={ord.assignedStaff.qrCode} alt="staff avatar" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-800">对接顾问: 【{ord.assignedStaff.name}】</span>
                                <span className="text-[9px] text-indigo-600">专家标签: {ord.assignedStaff.specialty}</span>
                              </div>
                              <p className="text-[9px] text-slate-400 truncate mt-0.5">顾问联系电话: {ord.assignedStaff.phone}</p>
                              
                              {/* QR attachment block shown instantly in orders */}
                              {ord.status === OrderStatus.PROCESSING && (
                                <div className="mt-2 bg-white border border-slate-100 p-2 rounded-lg flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <Smile className="w-4.5 h-4.5 text-emerald-500" />
                                    <span className="text-[9px] text-slate-700 leading-none">企业微信扫码一对一极速对接</span>
                                  </div>
                                  <a href="#view-qr" className="inline-block bg-indigo-600 text-white text-[8px] font-bold px-2 py-0.5 rounded">
                                    点看二维码
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          ord.status === OrderStatus.TIMEOUT ? (
                            <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-3 flex items-center space-x-2 mb-3">
                              <AlertCircle className="w-4 h-4 text-rose-500" />
                              <p className="text-[10px] text-rose-700">【超时移交】抱歉！派发顾问接单超时，正在执行管理端紧急审核分发。</p>
                            </div>
                          ) : (
                            <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-3 flex items-center space-x-2 mb-3">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              <p className="text-[10px] text-amber-700">正在通过决策树自动匹配最优在岗专员，请稍候...</p>
                            </div>
                          )
                        )}

                        {/* Order latest follow up logs timeline */}
                        <div className="mb-3">
                          <span className="text-[10px] text-slate-400 font-bold block mb-1">最新跟进流水日志:</span>
                          <div className="bg-slate-50 rounded-lg p-2 text-[9px] text-slate-500 border border-slate-200">
                            {ord.logs && ord.logs.length > 0 ? (
                              <div>
                                <span className="font-bold text-slate-700">[{ord.logs[ord.logs.length - 1].author}]: </span>
                                <span>{ord.logs[ord.logs.length - 1].content}</span>
                                <span className="block text-[8px] text-slate-300 mt-0.5 font-mono">
                                  {new Date(ord.logs[ord.logs.length - 1].time).toLocaleString("zh-CN")}
                                </span>
                              </div>
                            ) : (
                              <span>工单已成功暂存，待系统指派。</span>
                            )}
                          </div>
                        </div>

                        {/* Interactive Buttons footer within order cards */}
                        <div className="flex justify-end space-x-2">
                          
                          {/* Simulate Timeout Fast Forward for Demonstration Purposes */}
                          {ord.status === OrderStatus.PENDING_ACCEPT && (
                            <button
                              onClick={() => onTriggerTimeout(ord.id)}
                              className="px-2.5 py-1 text-[9px] bg-amber-500 text-white rounded font-bold hover:bg-amber-600 transition"
                            >
                              演练: 模拟超时未理
                            </button>
                          )}

                          {ord.status === OrderStatus.PROCESSING && (
                            <div className="flex items-center space-x-1.5">
                              <button
                                onClick={() => alert(`已成功发出催单警示！系统已对本次工单 GD${ord.id} 执行特急加急提醒。`)}
                                className="px-2.5 py-1 text-[9px] bg-amber-100 text-amber-800 rounded font-bold"
                              >
                                呼叫专属催单
                              </button>
                              <a
                                href={`tel:${ord.assignedStaff?.phone}`}
                                className="px-2.5 py-1 text-[9px] bg-indigo-600 text-white rounded font-bold flex items-center space-x-1"
                              >
                                <Phone className="w-2.5 h-2.5" />
                                <span>直拨热线</span>
                              </a>
                            </div>
                          )}

                          {ord.status === OrderStatus.PENDING_REVIEW && (
                            <button
                              onClick={() => {
                                setEvaluatingOrderId(ord.id);
                                setEvalStars(5);
                                setEvalFeedback("");
                              }}
                              className="px-3 py-1 text-[9px] bg-indigo-600 text-white rounded font-bold flex items-center space-x-1"
                            >
                              <Smile className="w-3 h-3" />
                              <span>满意度测评</span>
                            </button>
                          )}

                          {ord.status === OrderStatus.COMPLETED && ord.evaluation && (
                            <div className="flex items-center space-x-1 text-[9px] text-slate-400">
                              <span>已评分:</span>
                              <span className="text-amber-500">{"★".repeat(ord.evaluation.stars)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}

          {/* SCREEN 4: Visitor Reservations List (我的预约列表页) */}
          {activeScreen === "appointment-list" && (
            <motion.div
              id="mp-appointment-list-screen"
              key="appointment-list"
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="flex-grow flex flex-col pb-20 bg-slate-50 relative select-text"
            >
              {/* Header */}
              <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between shadow-xs relative z-10">
                <div className="flex items-center space-x-2">
                  <button type="button" onClick={() => setActiveScreen("home")} className="text-slate-600 hover:text-slate-900 mr-1 p-1 rounded-full hover:bg-slate-100 transition active:scale-95">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h3 className="font-bold text-sm text-slate-900 tracking-tight">我的预约</h3>
                </div>
                <div className="flex items-center space-x-1 border border-slate-100 bg-slate-50 px-2 py-1 rounded-full text-slate-800 scale-90">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-medium font-sans">预约系统</span>
                </div>
              </div>

              {/* List Area */}
              <div className="flex-grow overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
                {isLoadingAppointments ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-3">
                    <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-slate-400">正在获取预约清单...</p>
                  </div>
                ) : appointments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <Calendar className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">暂无预约信息记录</p>
                      <button type="button" onClick={() => {
                        const today = new Date();
                        const year = today.getFullYear();
                        const month = String(today.getMonth() + 1).padStart(2, '0');
                        const day = String(today.getDate()).padStart(2, '0');
                        setApptVisitTime(`${year}-${month}-${day}`);
                        setActiveScreen("appointment-form");
                      }} className="mt-2 text-xs text-indigo-600 font-bold underline">立即登记新访客</button>
                    </div>
                  </div>
                ) : (
                  appointments.map((apt) => (
                    <div
                      key={apt.id}
                      onClick={() => {
                        setSelectedAppointment(apt);
                        setActiveScreen("appointment-detail");
                      }}
                      className="bg-white rounded-xl p-4 shadow-xs border border-slate-100 hover:border-slate-200 transition duration-150 cursor-pointer flex flex-col hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between border-b border-dashed border-slate-100 pb-2.5 mb-2.5">
                        <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>预约时间：{apt.visitTime}</span>
                        </span>
                        
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          apt.status === "已完成" ? "bg-slate-100 text-slate-500 border border-slate-200/50" :
                          apt.status === "已过期" ? "bg-rose-50 text-rose-500 border border-rose-100/50" :
                          apt.status === "待来访" ? "bg-emerald-50 text-emerald-600 border border-emerald-100/50" :
                          "bg-amber-50 text-amber-600 border border-amber-100/50"
                        }`}>
                          {apt.status}
                        </span>
                      </div>

                      <div className="space-y-1 text-[11px] text-slate-500 mb-3 flex-grow font-sans">
                        <div className="flex">
                          <span className="w-16 shrink-0 text-slate-400">来访事由：</span>
                          <span className="text-slate-700 font-semibold">{apt.reason}</span>
                        </div>
                        <div className="flex">
                          <span className="w-16 shrink-0 text-slate-400">公司名称：</span>
                          <span className="text-slate-700 line-clamp-1">{apt.companyName}</span>
                        </div>
                      </div>

                      {/* Host Info Section */}
                      <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2.5 rounded-lg border border-slate-100/80 mb-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-[10px] font-bold shrink-0 font-sans">
                          {apt.hostName[0]}
                        </div>
                        <div className="text-[10px] text-slate-600 font-semibold flex-grow font-sans">
                          <span>受访人：{apt.hostName}</span>
                          <span className="text-slate-300 mx-1.5">|</span>
                          <span>电话：{apt.hostPhone || "15989066022"}</span>
                        </div>
                      </div>

                      {/* Direct Quick Rebook Button */}
                      <div className="border-t border-slate-100/80 pt-2.5 flex justify-end">
                        <button
                          type="button"
                          onClick={(e) => handleQuickRebook(apt, e)}
                          className="bg-[#eefcf4] hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 font-extrabold text-[10px] px-3 py-1.5 rounded-lg border border-emerald-150 flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3 text-emerald-600 animate-spin-slow" />
                          <span>再次预约 (直接生成当天新单)</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Floating Information button "? 来访指引" */}
              <button
                type="button"
                onClick={() => setIsVisitorGuideOpen(true)}
                className="absolute bottom-24 right-5 bg-white/95 text-slate-700 border border-slate-200 shadow-md rounded-full px-3 py-2 flex items-center space-x-1.5 hover:bg-slate-100 active:scale-95 transition z-20 text-[10px] font-bold cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-indigo-500" />
                <span>来访指引</span>
              </button>

              {/* Sticky bottom button "新增预约" */}
              <div className="p-4 bg-white border-t border-slate-200 absolute bottom-0 left-0 right-0 z-20">
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const day = String(today.getDate()).padStart(2, '0');
                    setApptVisitTime(`${year}-${month}-${day}`);
                    setActiveScreen("appointment-form");
                  }}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl font-bold text-xs tracking-wide shadow-md transition duration-150 cursor-pointer text-center"
                >
                  新增预约
                </button>
              </div>
            </motion.div>
          )}

          {/* SCREEN 5: Visitor Reservation Form (新增来访预约录入页) */}
          {activeScreen === "appointment-form" && (
            <motion.div
              id="mp-appointment-form-screen"
              key="appointment-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-grow flex flex-col pb-20 bg-slate-50 relative select-text"
            >
              {/* Header */}
              <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center space-x-2 shadow-xs">
                <button type="button" onClick={() => setActiveScreen("appointment-list")} className="text-slate-600 hover:text-slate-900 p-1 rounded-full hover:bg-slate-100 transition active:scale-95">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="font-bold text-sm text-slate-900 font-sans">登记来访预约</h3>
              </div>

              {/* Success Notification Bar */}
              {apptQuickFillSuccessMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-50 border-b border-emerald-100 px-4 py-2.5 text-[11px] text-emerald-800 flex items-center space-x-2 font-sans"
                >
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 font-bold" />
                  <span className="font-semibold leading-normal">{apptQuickFillSuccessMessage}</span>
                </motion.div>
              )}

              {/* Form container */}
              <form onSubmit={handleAppointmentSubmit} className="flex-grow overflow-y-auto p-4 pb-24 space-y-4 scrollbar-thin">
                
                {/* AI 口语与语音预约快捷录入 */}
                <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-4 shadow-sm space-y-3.5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl -mr-6 -mt-6 pointer-events-none" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                      <h4 className="text-[12px] font-extrabold tracking-wide uppercase font-sans">🎙️ AI 语音与口语提示词预约</h4>
                    </div>
                    <div className="text-[8px] bg-indigo-500/30 text-indigo-200 px-1.5 py-0.5 rounded-md border border-indigo-400/20 font-mono font-bold">
                      Gemini 3.5 Inside
                    </div>
                  </div>

                  <p className="text-[10px] text-indigo-200/90 font-sans leading-normal">
                    按住下方麦克风模拟录音，或直接粘贴一段口语化的到访需求，AI 即可秒级智能提取并全自动回填表单（含同行人员与车辆车牌）！
                  </p>

                  <div className="relative">
                    <textarea
                      value={apptQuickFillText}
                      onChange={(e) => setApptQuickFillText(e.target.value)}
                      placeholder="请按住下方按钮录音，或在此输入、粘贴口语预约内容描述..."
                      className="w-full h-24 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-xl p-3 text-[11px] text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-400 font-sans leading-relaxed resize-none transition"
                    />
                    {apptQuickFillText && (
                      <button
                        type="button"
                        onClick={() => setApptQuickFillText("")}
                        className="absolute right-2 top-2 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-700 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch gap-2">
                    <button
                      type="button"
                      disabled={isParsingApptQuickFill}
                      onClick={() => {
                        if (isRecordingApptVoice) return;
                        setIsRecordingApptVoice(true);
                        setApptQuickFillText("");
                        
                        const audioSamples = [
                          "你好，我是黄城涛，身份证431003199102072816，手机15221195697。下周我们计划去拜访检测所的徐工（徐永亮）做技术交流，我这次还带了一个同行同事钱帅，他的手机是18818911584，身份证号是431003198406222815，我们开一辆粤FB88888的车过去，麻烦登记下信息。",
                          "我是主访客钱帅，号码18818911584，身份证号是431003198406222815，代表广州蚁群信息科技有限公司，今天下午去检验送样，带了实验芯片样品，找徐永亮对接，会开粤FA08864车牌号的车辆入所。",
                          "老徐啊，我是高新技术园的黄城涛，手机15221195697，身份证431003199102072816。明天下午打算去你们所里进行业务交流，带了个笔记本电脑。随行同伴是钱帅，电话18818911584，身份证号431003198406222815。"
                        ];
                        
                        let counter = 0;
                        const randomSample = audioSamples[Math.floor(Math.random() * audioSamples.length)];
                        
                        const interval = setInterval(() => {
                          counter += 10;
                          setApptQuickFillText(randomSample.slice(0, counter));
                          if (counter >= randomSample.length) {
                            clearInterval(interval);
                            setIsRecordingApptVoice(false);
                          }
                        }, 50);
                      }}
                      className={`flex-grow flex items-center justify-center space-x-2 py-2.5 rounded-xl border font-bold text-[11px] transition duration-150 cursor-pointer ${
                        isRecordingApptVoice
                          ? "bg-rose-600 border-rose-500 text-white animate-pulse"
                          : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-750 hover:text-white"
                      }`}
                    >
                      <Mic className={`w-4 h-4 ${isRecordingApptVoice ? "text-rose-200 animate-bounce" : "text-indigo-400"}`} />
                      <span>{isRecordingApptVoice ? "🔊 AI 正在接收语音流听写中..." : "🎙️ 点击模拟 AI 语音接收"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleApptQuickFill}
                      disabled={isParsingApptQuickFill || isRecordingApptVoice || !apptQuickFillText.trim()}
                      className={`px-4 py-2.5 rounded-xl font-extrabold text-[11px] text-white flex items-center justify-center space-x-1.5 transition ${
                        !apptQuickFillText.trim() || isParsingApptQuickFill || isRecordingApptVoice
                          ? "bg-slate-800 text-slate-500 border border-slate-700 border-dashed cursor-not-allowed"
                          : "bg-indigo-600 hover:bg-indigo-700 active:scale-95 cursor-pointer"
                      }`}
                    >
                      {isParsingApptQuickFill ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Gemini 智能解析中...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                          <span>AI 一键快捷填单</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Built-in quick sample transcripts */}
                  <div className="pt-2 text-[10px] space-y-1.5 border-t border-slate-800">
                    <span className="font-semibold text-slate-400 block">💡 快速口语示例 (点击可代入测试)：</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setApptQuickFillText("我是黄城涛，身份证431003199102072816，电话15221195697。下周我们拜访徐永亮，公司名称是广州蚂蚁高新技术有限公司，同行人钱帅身份证是431003198406222815，电话18818911584，开车车牌为粤FB88888进行业务交流。");
                        }}
                        className="text-left bg-slate-900/80 hover:bg-slate-900 px-2 py-1.5 rounded text-[10px] text-slate-300 truncate border border-slate-800 hover:text-white transition"
                      >
                        👥 范例1：双人预约（带同行、车牌号）
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setApptQuickFillText("钱帅来登记，身份证号是431003198406222815，电话18818911584，广州蚁群公司的，今天开车牌粤FA08864的去检验送样，带了2盒钢板，去拜访徐工");
                        }}
                        className="text-left bg-slate-900/80 hover:bg-slate-900 px-2 py-1.5 rounded text-[10px] text-slate-300 truncate border border-slate-800 hover:text-white transition"
                      >
                        👤 范例2：单人送样车（车、物资、徐工）
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-100/90 shadow-xs space-y-3.5 text-xs text-slate-800">
                  <h4 className="text-[11px] font-extrabold text-indigo-600 tracking-wide uppercase border-l-3 border-indigo-600 pl-1.5 mb-1 font-sans">受访人与时间</h4>
                  
                  <div>
                    <label className="block text-slate-400 font-bold mb-1.5 font-sans">被访问人姓名 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={apptHostName}
                      onChange={(e) => setApptHostName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700 bg-slate-50/50 font-bold focus:outline-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1.5 font-sans">预约访问日期 <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={apptVisitTime}
                      onChange={(e) => setApptVisitTime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-100/90 shadow-xs space-y-3.5 text-xs text-slate-800">
                  <h4 className="text-[11px] font-extrabold text-indigo-600 tracking-wide uppercase border-l-3 border-indigo-600 pl-1.5 mb-1 font-sans">来访者基本信息</h4>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1.5 font-sans">来访者姓名 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="请填写真实有效姓名"
                      value={apptVisitorName}
                      onChange={(e) => setApptVisitorName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1.5 font-sans">身份证号 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      maxLength={18}
                      placeholder="18位居民身份证号码"
                      value={apptIdCard}
                      onChange={(e) => setApptIdCard(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700 font-mono focus:outline-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1.5 font-sans">手机号码 <span className="text-red-500">*</span></label>
                    <input
                      type="tel"
                      maxLength={11}
                      placeholder="真实联系电话"
                      value={apptPhone}
                      onChange={(e) => setApptPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700 font-mono focus:outline-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1.5 font-sans">公司名称 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="如：广州蚂蚁科技有限公司"
                      value={apptCompanyName}
                      onChange={(e) => setApptCompanyName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-100/90 shadow-xs space-y-3.5 text-xs text-slate-800">
                  <h4 className="text-[11px] font-extrabold text-indigo-600 tracking-wide uppercase border-l-3 border-indigo-600 pl-1.5 mb-1 font-sans">选填登记信息</h4>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1.5 font-sans">来访事由</label>
                    <input
                      type="text"
                      placeholder="如：业务往来、检验送样、技术交流..."
                      value={apptReason}
                      onChange={(e) => setApptReason(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1.5 font-sans">来访车辆车牌号</label>
                    <input
                      type="text"
                      placeholder="如：粤FA08864"
                      value={apptVehiclePlate}
                      onChange={(e) => setApptVehiclePlate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700 uppercase focus:outline-indigo-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1.5 font-sans">携带物品</label>
                    <input
                      type="text"
                      placeholder="如：笔记本电脑、测试样品等"
                      value={apptCarriedItems}
                      onChange={(e) => setApptCarriedItems(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-indigo-500"
                    />
                  </div>
                </div>

                {/* Companion List Dynamic Adding */}
                <div className="bg-white rounded-2xl p-4 border border-slate-100/90 shadow-xs space-y-3.5 text-xs text-slate-800">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="text-[11px] font-extrabold text-indigo-600 tracking-wide uppercase border-l-3 border-indigo-600 pl-1.5 font-sans">同行人员管理 ({apptCompanions.length}人)</h4>
                    <button
                      type="button"
                      onClick={() => setApptCompanions([...apptCompanions, { name: "", phone: "", idCard: "", vehiclePlate: "" }])}
                      className="px-2.5 py-1 text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg font-bold flex items-center space-x-1 border border-indigo-100/60 transition"
                    >
                      <Plus className="w-3 h-3" />
                      <span>添加同行人</span>
                    </button>
                  </div>

                  {apptCompanions.length > 0 && (
                    <div className="space-y-4 divide-y divide-slate-100 pt-2">
                      {apptCompanions.map((comp, idx) => (
                        <div key={idx} className="relative pt-3.5 space-y-3 first:pt-0 first:border-t-0 font-sans">
                          <div className="flex justify-between items-center bg-slate-50 px-2.5 py-1 rounded-md mb-2">
                            <span className="text-[10px] font-bold text-slate-700">同行人 #{String(idx + 1).padStart(2, '0')}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const copy = [...apptCompanions];
                                copy.splice(idx, 1);
                                setApptCompanions(copy);
                              }}
                              className="text-rose-500 hover:text-rose-700 text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>移除</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-slate-400 text-[11px] mb-1 font-sans">来访姓名 <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                placeholder="输入姓名"
                                value={comp.name}
                                onChange={(e) => {
                                  const copy = [...apptCompanions];
                                  copy[idx].name = e.target.value;
                                  setApptCompanions(copy);
                                }}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-slate-700 text-xs focus:outline-indigo-500 font-semibold"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-slate-400 text-[11px] mb-1 font-sans">手机号码 <span className="text-red-500">*</span></label>
                              <input
                                type="tel"
                                maxLength={11}
                                placeholder="手机号"
                                value={comp.phone}
                                onChange={(e) => {
                                  const copy = [...apptCompanions];
                                  copy[idx].phone = e.target.value;
                                  setApptCompanions(copy);
                                }}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-slate-700 text-xs font-mono focus:outline-indigo-500"
                                required
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-slate-400 text-[11px] mb-1 font-sans">身份证号 <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                maxLength={18}
                                placeholder="18位身份证"
                                value={comp.idCard}
                                onChange={(e) => {
                                  const copy = [...apptCompanions];
                                  copy[idx].idCard = e.target.value;
                                  setApptCompanions(copy);
                                }}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-slate-700 text-xs font-mono focus:outline-indigo-500"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-slate-400 text-[11px] mb-1 font-sans">车牌号码</label>
                              <input
                                type="text"
                                placeholder="选填车牌"
                                value={comp.vehiclePlate || ""}
                                onChange={(e) => {
                                  const copy = [...apptCompanions];
                                  copy[idx].vehiclePlate = e.target.value;
                                  setApptCompanions(copy);
                                }}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-slate-700 text-xs uppercase focus:outline-indigo-500 font-bold"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Submit Action */}
                <div className="p-4 bg-white border-t border-slate-200 absolute bottom-0 left-0 right-0 z-20">
                  <button
                    type="submit"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition duration-150 cursor-pointer text-center"
                  >
                    提交登记访客信息
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* SCREEN 6: Visitor Reservation Detail (来访预约详情展示页) */}
          {activeScreen === "appointment-detail" && selectedAppointment && (
            <motion.div
              id="mp-appointment-detail-screen"
              key="appointment-detail"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-grow flex flex-col pb-6 bg-[#f7f8fa] relative select-text"
            >
              {/* Header */}
              <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center space-x-2 shadow-xs">
                <button type="button" onClick={() => setActiveScreen("appointment-list")} className="text-slate-600 hover:text-slate-900 p-1 rounded-full hover:bg-slate-100 transition active:scale-95">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="font-bold text-sm text-slate-900 tracking-tight">预约详情</h3>
              </div>

              {/* Detail Contents with sleek iOS-like table formatting matching screenshots */}
              <div className="flex-grow overflow-y-auto pb-8 text-xs text-slate-800 scrollbar-thin">
                <div className="bg-white divide-y divide-slate-100 mt-2 border-y border-slate-100 font-sans">
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-slate-500 font-semibold">被访问人姓名</span>
                    <span className="font-bold text-slate-950">{selectedAppointment.hostName}</span>
                  </div>

                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-slate-500 font-semibold">预约访问时间</span>
                    <span className="font-bold text-slate-950">{selectedAppointment.visitTime}</span>
                  </div>

                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-slate-500 font-semibold">来访者者姓名</span>
                    <span className="font-bold text-slate-950">{selectedAppointment.visitorName}</span>
                  </div>

                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-slate-500 font-semibold">身份证</span>
                    <span className="font-mono text-slate-900 font-bold tracking-tight">
                      {selectedAppointment.idCard}
                    </span>
                  </div>

                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-slate-500 font-semibold">手机号</span>
                    <span className="font-mono text-slate-900 font-extrabold">{selectedAppointment.phone}</span>
                  </div>

                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-slate-500 font-semibold">来访事由</span>
                    <span className="font-bold text-slate-950">{selectedAppointment.reason}</span>
                  </div>

                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-slate-500 font-semibold">来访车辆</span>
                    <span className="font-bold text-slate-950">{selectedAppointment.vehiclePlate || "无"}</span>
                  </div>

                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-slate-500 font-semibold">公司名称</span>
                    <span className="font-bold text-slate-950 leading-snug max-w-[65%] text-right">{selectedAppointment.companyName}</span>
                  </div>

                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-slate-500 font-semibold">携带物品</span>
                    <span className="font-bold text-slate-950">{selectedAppointment.carriedItems || "无"}</span>
                  </div>

                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-slate-500 font-semibold">预约状态</span>
                    <span className={`font-extrabold ${
                      selectedAppointment.status === "已完成" ? "text-slate-500" :
                      selectedAppointment.status === "已过期" ? "text-rose-500" :
                      selectedAppointment.status === "待来访" ? "text-emerald-500 animate-pulse" :
                      "text-amber-500"
                    }`}>{selectedAppointment.status}</span>
                  </div>

                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-slate-500 font-semibold">入所时间</span>
                    <span className="font-mono text-slate-600 font-bold">{selectedAppointment.entryTime || "未到访"}</span>
                  </div>

                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-slate-500 font-semibold">离所时间</span>
                    <span className="font-mono text-slate-600 font-bold">{selectedAppointment.exitTime || "未出离"}</span>
                  </div>
                </div>

                {/* Companions portion */}
                {selectedAppointment.companions && selectedAppointment.companions.length > 0 && (
                  <div className="mt-4 font-sans">
                    {selectedAppointment.companions.map((comp, compIdx) => (
                      <div key={compIdx} className="mt-4">
                        <div className="px-4 py-1.5 flex items-center justify-between text-slate-500 bg-[#f1f2f5] font-bold text-[10px] tracking-wider uppercase mb-1">
                          <span>同行人 {String(compIdx + 1).padStart(2, '0')}</span>
                        </div>
                        
                        <div className="bg-white divide-y divide-slate-100 border-y border-slate-100 font-sans">
                          <div className="flex justify-between items-center px-4 py-3">
                            <span className="text-slate-500 font-semibold">来访人姓名</span>
                            <span className="font-bold text-slate-950">{comp.name}</span>
                          </div>

                          <div className="flex justify-between items-center px-4 py-3">
                            <span className="text-slate-500 font-semibold">手机号</span>
                            <span className="font-mono text-slate-900 font-extrabold">{comp.phone}</span>
                          </div>

                          <div className="flex justify-between items-center px-4 py-3">
                            <span className="text-slate-500 font-semibold">身份证</span>
                            <span className="font-mono text-slate-900 font-bold tracking-tight">
                              {comp.idCard}
                            </span>
                          </div>

                          <div className="flex justify-between items-center px-4 py-3">
                            <span className="text-slate-500 font-semibold">车牌号</span>
                            <span className="font-bold text-slate-950">{comp.vehiclePlate || "无"}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* OVERLAY COMPONENT B: Visitor entry guidelines modal */}
      {isVisitorGuideOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-xl border border-slate-100 flex flex-col max-h-[90%] select-text">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                <HelpCircle className="w-4 h-4 text-indigo-600 animate-pulse" />
                <span>中国工业实验室来访指引说明</span>
              </span>
              <button onClick={() => setIsVisitorGuideOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 flex-1 overflow-y-auto space-y-4 text-xs text-slate-600 leading-relaxed font-sans scrollbar-thin">
              <div>
                <h5 className="font-bold text-slate-800 text-[11px] mb-1 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping-slow" />
                  <span>一、预约须知</span>
                </h5>
                <p className="pl-3 text-[11px]">
                  为保障所内秩序与信息安全，所有来访人员（含随行人员）必须提前通过本微信小程序提交姓名、身份证号等信息进行实名制预约。
                </p>
              </div>

              <div>
                <h5 className="font-bold text-slate-800 text-[11px] mb-1 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping-slow" />
                  <span>二、车辆入所规则</span>
                </h5>
                <p className="pl-3 text-[11px]">
                  自驾车辆请务必登记正确的完整车牌号。无登记车辆无法通过正门车牌自动识别闸，需在大门外找公共车位停放。
                </p>
              </div>

              <div>
                <h5 className="font-bold text-slate-800 text-[11px] mb-1 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping-slow" />
                  <span>三、安全与物品携出</span>
                </h5>
                <p className="pl-3 text-[11px]">
                  所内严禁对试验室、重要机台、检测设备区域随意拍照录像。携带便携式笔记本电脑、大型专业实验仪器进出，需在安保岗配合保卫登记。
                </p>
              </div>

              <div>
                <h5 className="font-bold text-slate-800 text-[11px] mb-1 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping-slow" />
                  <span>四、签到放行</span>
                </h5>
                <p className="pl-3 text-[11px]">
                  到达正门岗亭后，请配合出示身份证及在“我的预约”中显示绿色“待来访”标志，登记后换取临时来访证放行入所。
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsVisitorGuideOpen(false)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 font-extrabold rounded-xl text-white text-xs text-center shadow-sm select-none transition active:scale-95 cursor-pointer"
              >
                我已认真阅读并同意
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Global Floating AI Consultant Entry Button in lower right */}
        <button
          onClick={() => {
            setIsChatOpen(true);
            setExtractedStatus({
              companyName: "",
              industry: "",
              contactName: "",
              contactPhone: "",
              description: "",
              serviceType: ""
            });
          }}
          className="absolute bottom-20 right-4 w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center z-30 group cursor-pointer transition"
          title="⚡ AI智能对话建单"
        >
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          >
            <Sparkles className="w-5 h-5 text-amber-200" />
          </motion.div>
          {/* Badge indicator */}
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
        </button>
      </div>

      {/* FOOTER TAB NAV BAR - Mimicking WeChat Applets */}
      <div className="bg-white border-t border-slate-200 px-3 py-2 grid grid-cols-5 text-center relative z-10 font-sans">
        
        <button 
          onClick={() => setActiveScreen("home")} 
          className={`flex flex-col items-center justify-center select-none space-y-0.5 transition active:scale-95 ${activeScreen === "home" ? "text-indigo-600 font-semibold" : "text-slate-400"}`}
        >
          <Home className={`w-5 h-5 transition-colors ${activeScreen === "home" ? "text-indigo-600" : "text-slate-400"}`} />
          <span className="text-[9px] tracking-tight">首页</span>
        </button>

        <button 
          onClick={() => alert("【赛宝专业论坛区测试】论坛模块目前仅充当演示板块。")} 
          className="flex flex-col items-center justify-center select-none text-slate-400 space-y-0.5 transition active:scale-95"
        >
          <MessageSquare className="w-5 h-5 text-slate-400" />
          <span className="text-[9px] tracking-tight">论坛</span>
        </button>

        {/* Giant Bubble for Business consulting */}
        <div className="relative -top-4 flex justify-center">
          <button 
            onClick={() => setActiveScreen("form")} 
            className="w-12 h-12 rounded-full bg-indigo-600 text-white shadow-md border-3 border-white flex items-center justify-center select-none hover:bg-indigo-700 transition active:scale-95 hover:shadow-lg"
          >
            <Plus className="w-6 h-6 text-white" />
          </button>
        </div>

        <button 
          onClick={() => alert("【线下专题培训】培训模块当前不可选。")} 
          className="flex flex-col items-center justify-center select-none text-slate-400 space-y-0.5 transition active:scale-95"
        >
          <GraduationCap className="w-5 h-5 text-slate-400" />
          <span className="text-[9px] tracking-tight">培训</span>
        </button>

        <button 
          onClick={() => setActiveScreen("my-orders")} 
          className={`flex flex-col items-center justify-center select-none space-y-0.5 transition active:scale-95 ${activeScreen === "my-orders" ? "text-indigo-600 font-semibold" : "text-slate-400"}`}
        >
          <Folder className={`w-5 h-5 transition-colors ${activeScreen === "my-orders" ? "text-indigo-600" : "text-slate-400"}`} />
          <span className="text-[9px] tracking-tight">我的咨询</span>
        </button>
      </div>

      {/* OVERLAY COMPONENT A: Form quick-fill input area */}
      {isQuickFillOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl p-4 shadow-xl border border-slate-100 flex flex-col max-h-[90%]">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
                <span>AI智能语句特征识别</span>
              </span>
              <button onClick={() => setIsQuickFillOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-3 flex-1 overflow-y-auto space-y-3">
              <p className="text-[11px] text-slate-500">
                请在此处粘贴或口语化描述您公司的业务情况、联系人姓名电话。AI将自动匹配分类并完美填表！
              </p>
              
              <div className="relative">
                <textarea
                  rows={5}
                  value={quickFillText}
                  onChange={(e) => setQuickFillText(e.target.value)}
                  placeholder="例如：“我是广州赛宝材料科技中心的李主任，电话是13511112222，研发了一款耐热塑胶，近期想加急做一个大剪切形变拉力理化可靠性及耐磨损性能测试，行业属于智能新物料制造。”"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-hidden focus:ring-1 focus:ring-blue-500 resize-none pr-8"
                />
                {quickFillText && (
                  <button
                    type="button"
                    onClick={() => setQuickFillText("")}
                    className="absolute right-2 top-2 text-slate-400 hover:text-red-500 p-1 rounded-full hover:bg-slate-100 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Voice Input Trigger Button */}
              <div className="flex flex-col space-y-1.5">
                <button
                  type="button"
                  disabled={isParsingQuickFill}
                  onClick={startOrderSpeechRecognition}
                  className={`w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl border text-[11px] font-bold transition duration-150 cursor-pointer ${
                    isRecordingOrderVoice
                      ? "bg-rose-600 border-rose-500 text-white animate-pulse"
                      : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-755"
                  }`}
                >
                  <Mic className={`w-3.5 h-3.5 ${isRecordingOrderVoice ? "text-rose-200 animate-bounce" : "text-indigo-600 dark:text-indigo-400"}`} />
                  <span>{isRecordingOrderVoice ? "🔊 AI 正在接收语音流听写中 (点击结束)..." : "🎙️ 点击模拟 AI 语音接收 (支持一键免打字)"}</span>
                </button>

                {orderSpeechError && (
                  <div className="text-[9px] text-amber-600 bg-amber-50 rounded-lg p-2 flex items-center space-x-1 border border-amber-100">
                    <span>⚠️ {orderSpeechError}</span>
                  </div>
                )}
              </div>

              {/* Sample helper trigger tags */}
              <div className="bg-slate-50 p-2.5 rounded-lg">
                <span className="text-[9px] text-slate-400 font-bold block mb-1">点选快捷示例语句试验：</span>
                <div className="space-y-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setQuickFillText("我是腾讯云汽车事业部的马经理。想做一款车载毫米波雷材的ISO26262标准资质评估及CCC安全认证，联系方式是13912345678。我们是芯片雷达领域的。")}
                    className="block leading-tight text-left text-blue-600 underline"
                  >
                    💡 测试 [认证评估]：腾讯汽车资质评估
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickFillText("我是比亚迪研发院的王工，想对新能源大巴底盘焊接的钢材进行一个理化力学测试与抗压抗疲劳寿命极限检测。手机号13500001111，属于汽车重工行业")}
                    className="block leading-tight text-left text-blue-600 underline animate-pulse"
                  >
                    💡 测试 [检验检测]：比亚迪底盘金属化验性测试
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex space-x-2">
              <button
                type="button"
                onClick={() => setIsQuickFillOpen(false)}
                className="flex-1 py-2 rounded-lg text-slate-600 border border-slate-200 text-xs hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!quickFillText.trim() || isParsingQuickFill}
                onClick={triggerAiQuickFill}
                className={`flex-1 py-2 rounded-lg text-white text-xs font-bold flex items-center justify-center space-x-1 ${quickFillText.trim() ? "bg-indigo-600 hover:bg-indigo-700" : "bg-slate-300 cursor-not-allowed"}`}
              >
                {isParsingQuickFill ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>大模型深度分析中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                    <span>AI一键全字段回填</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY COMPONENT B: Standard full screen evaluation modal */}
      {evaluatingOrderId && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl p-4 shadow-xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-900">满意度及服务效率测评</h4>
              <button onClick={() => setEvaluatingOrderId(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] text-slate-500 text-center">
                本次市场派单及咨询专家解答已闭环。请问对本次服务整体效率评分如何？（1星最差，5星最优）
              </p>

              {/* Star selector */}
              <div className="flex justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((st) => (
                  <button
                    key={st}
                    onClick={() => setEvalStars(st)}
                    type="button"
                    className="text-2xl cursor-pointer hover:scale-110 duration-100"
                  >
                    {st <= evalStars ? "★" : "☆"}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">写下您的感谢或反馈建议:</label>
                <textarea
                  rows={3}
                  value={evalFeedback}
                  onChange={(e) => setEvalFeedback(e.target.value)}
                  placeholder="如：解答非常到位，响应迅速，微信一下就接通了。"
                  className="w-full bg-slate-50 p-2 text-xs border border-slate-200 rounded-lg outline-hidden"
                />
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setEvaluatingOrderId(null)}
                className="flex-1 py-2 text-xs border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={handleEvaluateSubmit}
                className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                立刻提交满意度评分
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY COMPONENT C: Highly Interactive WeChatwork-Style Overlay Chat Panel */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            id="ai-consultant-chat-overlay"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="absolute inset-x-0 bottom-0 top-[40px] bg-slate-900 text-white z-40 rounded-t-[32px] flex flex-col shadow-[0_-15px_40px_rgba(0,0,0,0.4)] overflow-hidden"
          >
            {/* Chat Room Top Navigation bar */}
            <div className="bg-slate-850 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                  科
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100 flex items-center space-x-1">
                    <span>赛宝全功能AI专家客服 (7合1智慧大脑)</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                  </h4>
                  <p className="text-[8px] text-slate-300">介绍 / 咨询 / 来访 / 查询 / 培训 / 解读 / 动态</p>
                </div>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-slate-400 hover:text-white bg-white/10 p-1 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* AI Field progress trace checklist */}
            <div className="bg-slate-950 border-b border-slate-800 p-2 px-4 flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-slate-400">
              <span className="font-bold text-slate-200">采集进度：</span>
              <span className={extractedStatus.companyName ? "text-emerald-400" : "text-slate-500"}>
                {extractedStatus.companyName ? "✓ 单位" : "✗ 单位"}
              </span>
              <span className={extractedStatus.industry ? "text-emerald-400" : "text-slate-500"}>
                {extractedStatus.industry ? "✓ 行业" : "✗ 行业"}
              </span>
              <span className={extractedStatus.contactName ? "text-emerald-400" : "text-slate-500"}>
                {extractedStatus.contactName ? "✓ 姓名" : "✗ 姓名"}
              </span>
              <span className={extractedStatus.contactPhone ? "text-emerald-400" : "text-slate-500"}>
                {extractedStatus.contactPhone ? "✓ 电话" : "✗ 电话"}
              </span>
              <span className={extractedStatus.description ? "text-emerald-400" : "text-slate-500"}>
                {extractedStatus.description ? "✓ 需求" : "✗ 需求"}
              </span>
              <span className={extractedStatus.serviceType ? "text-amber-300 font-bold" : "text-slate-500"}>
                类别: {extractedStatus.serviceType || "未定"}
              </span>
            </div>

            {/* Bubble logs timeline */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/80">
              {chatMessages.map((msg, idx) => {
                const isAi = msg.sender === "ai";
                return (
                  <div key={idx} className={`flex ${isAi ? "justify-start" : "justify-end"}`}>
                    <div className={`flex items-start space-x-2 max-w-[85%] ${isAi ? "flex-row" : "flex-row-reverse space-x-reverse"}`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 select-none ${isAi ? "bg-indigo-600 text-white" : "bg-emerald-600 text-white"}`}>
                        {isAi ? "AI" : "我"}
                      </div>
                      <div className="space-y-0.5">
                        <div className={`rounded-2xl p-3 text-xs leading-relaxed whitespace-pre-wrap ${isAi ? "bg-slate-800 text-slate-100" : "bg-indigo-600 text-white"}`}>
                          {msg.content}
                        </div>
                        <span className="text-[8px] text-slate-600 block text-right font-sans select-none">{msg.time}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Loader Typing */}
              {isAiTyping && (
                <div className="flex justify-start">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-xs">AI</div>
                    <div className="bg-slate-800 rounded-2xl px-4 py-2 flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-0" />
                      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-150" />
                      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-300" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Visual Wave Overlay when Listening */}
            <AnimatePresence>
              {isRecording && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="bg-indigo-950/95 border-t border-indigo-800/40 p-2 px-4 flex items-center justify-between text-[10px] text-indigo-200 z-10"
                >
                  <div className="flex items-center space-x-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                    </span>
                    <span className="font-semibold select-none animate-pulse">
                      {speechError ? speechError : "正在录音识别中，请开始对麦克风说话..."}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 shrink-0">
                    <span className="w-0.5 h-2.5 bg-indigo-400 animate-bounce" style={{ animationDelay: "0s" }} />
                    <span className="w-0.5 h-4 bg-indigo-400 animate-bounce" style={{ animationDelay: "0.15s" }} />
                    <span className="w-0.5 h-2 bg-indigo-400 animate-bounce" style={{ animationDelay: "0.3s" }} />
                    <span className="w-0.5 h-5 bg-indigo-400 animate-bounce" style={{ animationDelay: "0.45s" }} />
                    <span className="w-0.5 h-3 bg-indigo-400 animate-bounce" style={{ animationDelay: "0.6s" }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick action scrollable chips */}
            <div className="px-3 py-2 bg-slate-950 border-t border-slate-850 flex items-center space-x-2 overflow-x-auto scrollbar-none shrink-0 select-none">
              <span className="text-[10px] font-bold text-indigo-400 shrink-0 font-sans tracking-tight">快捷咨询:</span>
              {[
                { label: "🏢 业务介绍", query: "请为您介绍赛宝实验室双重资质、技术分布及背景宗旨" },
                { label: "💡 咨询收费", query: "我想咨询芯片、先进材料检测项目及具体收费标准？" },
                { label: "📅 来访预约说明", query: "我想了解实验室访客来访政策、安全须知与预约流程。" },
                { label: "🔍 委托进度查询", query: "我想实时查询名下的委托订单状态与最新跟进日志进度" },
                { label: "🎓 线下高阶培训", query: "2026年近期有什么线下高阶精品培训课程及报名渠道学费？" },
                { label: "📚 专题标准解读", query: "我想获取ISO/IEC 17025、AEC-Q100与RoHS 2.0三大标准的专题解读" },
                { label: "📰 前沿新闻动态", query: "请帮我播报最新的五米封闭测试暗室和全国检测百强新闻" },
                { label: "📝 智能在线建单", query: "我想口语化告知您样品信息，自主在系统进行下单立案登记" }
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendChat(chip.query)}
                  className="bg-slate-800/85 hover:bg-indigo-900 border border-slate-755 text-slate-100 text-[10px] px-2.5 py-1 rounded-full cursor-pointer whitespace-nowrap transition duration-150 active:scale-95 font-sans font-medium"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Chat Inputs text box */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center space-x-2">
              <button
                type="button"
                onClick={startSpeechRecognition}
                className={`p-2.5 rounded-xl flex items-center justify-center transition cursor-pointer shrink-0 ${isRecording ? "bg-rose-600 text-white animate-pulse" : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"}`}
                title={isRecording ? "停止录音" : "点击麦克风 录音识别语言"}
              >
                <Mic className="w-4 h-4" />
              </button>
              
              <input
                type="text"
                placeholder={isRecording ? "正在聆听语音输入..." : "发送您的业务或问询..."}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
              />
              <button
                onClick={handleSendChat}
                disabled={!chatInput.trim()}
                className={`p-2.5 rounded-xl flex items-center justify-center transition cursor-pointer ${chatInput.trim() ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-slate-800 text-slate-500 cursor-not-allowed"}`}
              >
                <SendHorizontal className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
