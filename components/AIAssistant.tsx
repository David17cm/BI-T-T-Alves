import React, { useState, useEffect, useRef } from 'react';
import { sendMessageToAI } from '../services/aiService';
import { DashboardStats } from '../types';

interface Message {
    role: 'user' | 'model';
    text: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    stats: DashboardStats | null;
}

const AIAssistant: React.FC<Props> = ({ isOpen, onClose, stats }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{ role: 'model', text: 'Olá! Sou seu assistente de BI. Posso analisar seus dados de vendas, matrículas e tráfego. Como posso ajudar hoje?' }]);
        }
    }, [isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        try {
            const context = stats ? JSON.stringify({
                totalVendas: stats.totalSales,
                totalRecebido: stats.totalReceived,
                totalMatriculas: stats.totalEnrollments,
                ticketMedio: stats.averageTicket,
                porCurso: stats.courseMetrics.map(c => ({ nome: c.name, vendas: c.enrollmentCount, total: c.totalSales })),
                status: stats.statusDistribution,
                topAtendentes: stats.attendantMetrics.slice(0, 5).map(a => ({ nome: a.name, vendas: a.enrollmentCount }))
            }, null, 2) : "Nenhum dado carregado ainda.";

            const history = messages
                .filter(m => m.text !== 'Olá! Sou seu assistente de BI. Posso analisar seus dados de vendas, matrículas e tráfego. Como posso ajudar hoje?')
                .map(m => ({ role: m.role, text: m.text }));

            const responseText = await sendMessageToAI(history, context, userMsg);
            setMessages(prev => [...prev, { role: 'model', text: responseText }]);
        } catch (error: any) {
            setMessages(prev => [...prev, { role: 'model', text: `Erro: ${error.message}` }]);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full md:w-[400px] bg-white h-full shadow-2xl flex flex-col">
                {/* Header */}
                <div className="bg-[#231F20] text-white p-6 flex items-center justify-between shadow-lg z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#E31E24] rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <div>
                            <h3 className="font-black uppercase tracking-widest text-sm">IA Analyst</h3>
                            <p className="text-[9px] text-zinc-400">Powered by Gemini</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-[#F8F9FA] custom-scrollbar">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${msg.role === 'user'
                                ? 'bg-[#231F20] text-white rounded-tr-none'
                                : 'bg-white text-zinc-700 rounded-tl-none border border-zinc-100'
                                }`}>
                                {msg.text.split('\n').map((line, i) => <p key={i} className="mb-1 last:mb-0">{line}</p>)}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-zinc-100 shadow-sm">
                                <div className="flex gap-1.5">
                                    <div className="w-2 h-2 bg-zinc-300 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-2 h-2 bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-white border-t border-zinc-100">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !loading && handleSend()}
                            placeholder="Pergunte sobre seus dados..."
                            disabled={loading}
                            className="flex-grow px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E31E24] disabled:opacity-50"
                        />
                        <button
                            onClick={handleSend}
                            disabled={loading || !input.trim()}
                            className="p-3 bg-[#E31E24] text-white rounded-xl hover:bg-red-700 transition-all shadow-lg disabled:opacity-50 disabled:shadow-none"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIAssistant;
