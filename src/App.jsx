import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  TrendingUp,
  Trash2,
  LayoutDashboard,
  PieChart,
  Settings,
  RefreshCw,
  AlertCircle,
  Clock,
} from 'lucide-react';

// 配置區
const API_CONFIG = {
  // 注意：請確保此 Key 有效。若缺少會在介面提示錯誤。
  KEY: import.meta.env.VITE_ALPHA_VANTAGE_KEY || '',
  BASE_URL: 'https://www.alphavantage.co/query',
  REFRESH_INTERVAL: 60000,
};

const App = () => {
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem('my_stocks_v2');
    return saved ? JSON.parse(saved) : ['AAPL', 'NVDA', 'TSLA', 'MSFT'];
  });

  const [stockData, setStockData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStock, setSelectedStock] = useState('AAPL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [errorMessage, setErrorMessage] = useState('');

  // 持久化存儲
  useEffect(() => {
    localStorage.setItem('my_stocks_v2', JSON.stringify(watchlist));
  }, [watchlist]);

  // 單個股票數據抓取
  const fetchSingleQuote = async (symbol) => {
    const url = `${API_CONFIG.BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_CONFIG.KEY}`;
    try {
      const response = await fetch(url);
      const data = await response.json();

      // 處理頻率限制訊息
      if (data['Note'] || data['Information']) {
        console.warn('API 提示:', data['Note'] || data['Information']);
        return null;
      }

      const quote = data['Global Quote'];
      if (!quote || Object.keys(quote).length === 0) return null;

      return {
        symbol: quote['01. symbol'],
        price: parseFloat(quote['05. price']).toFixed(2),
        change: parseFloat(quote['10. change percent']?.replace('%', '') || 0).toFixed(2),
        volume: quote['06. volume'],
        lastDay: quote['07. latest trading day'],
      };
    } catch (err) {
      console.error(`抓取 ${symbol} 失敗:`, err);
      return null;
    }
  };

  // 批量抓取邏輯
  const fetchAllData = useCallback(async () => {
    if (!API_CONFIG.KEY) {
      setErrorMessage('尚未設定 API key，請設定 VITE_ALPHA_VANTAGE_KEY');
      setIsRefreshing(false);
      return;
    }
    setIsRefreshing(true);
    setErrorMessage('');

    let hasError = false;
    const results = { ...stockData };

    for (const symbol of watchlist) {
      const data = await fetchSingleQuote(symbol);
      if (data) {
        results[symbol] = {
          ...data,
          history: stockData[symbol]?.history
            ? [...stockData[symbol].history.slice(-14), parseFloat(data.price)]
            : [parseFloat(data.price)],
        };
      } else {
        hasError = true;
      }
      // 間隔避免觸發頻率限制
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (hasError) {
      setErrorMessage('部分數據更新失敗（可能達到 API 頻率限制）');
    }

    setStockData(results);
    setLastUpdated(new Date());
    setIsRefreshing(false);
  }, [watchlist, stockData]);

  // 初始化與自動定時器
  useEffect(() => {
    if (!API_CONFIG.KEY) {
      setErrorMessage('尚未設定 API key，請設定 VITE_ALPHA_VANTAGE_KEY');
      return undefined;
    }
    fetchAllData();
    const timer = setInterval(fetchAllData, API_CONFIG.REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [watchlist.length, fetchAllData]);

  const addToWatchlist = (symbol) => {
    const cleanSymbol = symbol.trim().toUpperCase();
    if (cleanSymbol && !watchlist.includes(cleanSymbol)) {
      setWatchlist((prev) => [...prev, cleanSymbol]);
      setSelectedStock(cleanSymbol);
    }
    setSearchTerm('');
  };

  const removeFromWatchlist = (symbol) => {
    const newWatchlist = watchlist.filter((s) => s !== symbol);
    setWatchlist(newWatchlist);
    if (selectedStock === symbol && newWatchlist.length > 0) {
      setSelectedStock(newWatchlist[0]);
    }
  };

  const MiniChart = ({ data, color }) => {
    if (!data || data.length < 2) return <div className="w-24 h-10 bg-slate-50 rounded animate-pulse" />;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const points = data
      .map((val, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 40 - ((val - min) / range) * 35;
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <svg className="w-24 h-10 overflow-visible" viewBox="0 0 100 40">
        <polyline fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" points={points} />
      </svg>
    );
  };

  const currentStock = stockData[selectedStock] || Object.values(stockData)[0];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      {/* 側邊導航 */}
      <nav className="w-20 lg:w-64 bg-white border-r border-slate-200 flex flex-col p-4">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200">
            <TrendingUp size={24} />
          </div>
          <span className="hidden lg:block font-bold text-xl tracking-tight">StockLive</span>
        </div>
        <div className="space-y-1">
          <NavItem icon={<LayoutDashboard size={20} />} label="市場概覽" active />
          <NavItem icon={<PieChart size={20} />} label="投資組合" />
          <NavItem icon={<Settings size={20} />} label="設定" />
        </div>

        <div className="mt-auto hidden lg:block p-4 bg-blue-50 rounded-2xl border border-blue-100">
          <div className="flex items-center gap-2 text-blue-700 mb-2">
            <Clock size={16} />
            <span className="text-xs font-bold">API 狀態</span>
          </div>
          <p className="text-[10px] text-blue-600 leading-relaxed mb-2">
            {isRefreshing ? '正在嘗試連接真實數據...' : '已就緒。免費版有限制更新頻率。'}
          </p>
          <div className="w-full bg-blue-200 h-1 rounded-full overflow-hidden">
            <div
              className={`h-full bg-blue-500 transition-all duration-700 ${isRefreshing ? 'w-full' : 'w-0'}`}
            ></div>
          </div>
        </div>
      </nav>

      {/* 主畫面 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <div className="relative w-72">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              type="text"
              placeholder="搜尋代碼 (例如: NVDA)..."
              className="w-full bg-slate-100 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addToWatchlist(searchTerm)}
            />
          </div>

          <div className="flex items-center gap-4">
            {errorMessage && (
              <span className="text-amber-600 text-[10px] md:text-xs font-medium flex items-center gap-1 bg-amber-50 px-2 py-1 rounded">
                <AlertCircle size={14} /> {errorMessage}
              </span>
            )}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="hidden md:inline italic">
                更新於: {lastUpdated.toLocaleTimeString()}
              </span>
              <button
                onClick={fetchAllData}
                disabled={isRefreshing}
                className={`p-2 hover:bg-slate-100 rounded-full transition-all ${isRefreshing ? 'animate-spin text-blue-500' : ''}`}
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* 核心展示區域 */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
              {currentStock ? (
                <>
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-5xl font-black tracking-tighter">
                          {currentStock.symbol}
                        </h1>
                        <span className="text-xs font-bold text-slate-300 border border-slate-200 px-2 py-0.5 rounded uppercase font-mono">
                          LIVE
                        </span>
                      </div>
                      <p className="text-slate-400 font-medium">實時成交價格 (USD)</p>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-bold mb-2 tabular-nums">${currentStock.price}</p>
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${
                          parseFloat(currentStock.change) >= 0
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-rose-50 text-rose-600'
                        }`}
                      >
                        {parseFloat(currentStock.change) >= 0 ? '+' : ''}
                        {currentStock.change}%
                      </span>
                    </div>
                  </div>

                  <div className="h-48 w-full bg-slate-50 rounded-2xl flex items-end p-6 gap-2 border border-slate-100 relative group">
                    {currentStock.history?.map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-blue-500 rounded-t-sm opacity-20 hover:opacity-50 transition-all cursor-crosshair"
                        style={{
                          height: `${
                            ((h - Math.min(...currentStock.history) * 0.98) /
                              (Math.max(...currentStock.history) * 1.02 -
                                Math.min(...currentStock.history) * 0.98)) *
                            100
                          }%`,
                        }}
                      ></div>
                    ))}
                    {!currentStock.history && (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-300 italic">
                        等待圖表數據...
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-6 text-xs text-slate-400 font-medium">
                    <div className="flex flex-col">
                      <span>成交量</span>
                      <span className="text-slate-900 font-bold">
                        {currentStock.volume || '--'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span>交易日</span>
                      <span className="text-slate-900 font-bold">
                        {currentStock.lastDay || '--'}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-300 animate-pulse">
                  正在初始化資產數據...
                </div>
              )}
            </div>

            {/* 自選清單表格 */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold">我的自選清單</h3>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  市場監控中
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-50">
                      <th className="px-6 py-3 font-bold">資產名稱</th>
                      <th className="px-6 py-3 font-bold text-right">現價</th>
                      <th className="px-6 py-3 font-bold text-right">當日漲跌</th>
                      <th className="px-6 py-3 font-bold text-center">趨勢</th>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {watchlist.map((symbol) => {
                      const data = stockData[symbol];
                      if (!data) return null;
                      const isUp = parseFloat(data.change) >= 0;
                      return (
                        <tr
                          key={symbol}
                          onClick={() => setSelectedStock(symbol)}
                          className={`group cursor-pointer transition-colors ${
                            selectedStock === symbol ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xs">
                                {symbol.substring(0, 2)}
                              </div>
                              <span className="font-bold">{symbol}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-bold tabular-nums">
                            ${data.price}
                          </td>
                          <td
                            className={`px-6 py-4 text-right font-bold tabular-nums ${
                              isUp ? 'text-emerald-500' : 'text-rose-500'
                            }`}
                          >
                            {isUp ? '+' : ''}
                            {data.change}%
                          </td>
                          <td className="px-6 py-4 flex justify-center">
                            <MiniChart data={data.history} color={isUp ? '#10b981' : '#f43f5e'} />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromWatchlist(symbol);
                              }}
                              className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {watchlist.length === 0 && (
                <div className="p-12 text-center text-slate-300">
                  目前沒有追蹤的股票，請從上方搜尋新增。
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, active = false }) => (
  <button
    className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all ${
      active ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-400 hover:bg-slate-50'
    }`}
  >
    {icon}
    <span className="hidden lg:block text-sm">{label}</span>
  </button>
);

export default App;
