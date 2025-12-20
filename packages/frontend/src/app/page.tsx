import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">
          高等教育國際化策略執行管理系統
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/dashboard" className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold mb-2">📊 戰略儀表板</h2>
            <p className="text-gray-600">查看 BSC 四構面總覽與 KPI 狀態</p>
          </Link>
          
          <Link href="/kpi" className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold mb-2">📈 KPI Registry</h2>
            <p className="text-gray-600">管理指標字典與定義</p>
          </Link>
          
          <Link href="/initiatives" className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold mb-2">🎯 策略專案</h2>
            <p className="text-gray-600">管理 Initiatives 與 OKR</p>
          </Link>
          
          <Link href="/kanban" className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold mb-2">✅ Kanban 看板</h2>
            <p className="text-gray-600">任務管理與追蹤</p>
          </Link>
          
          <Link href="/raci" className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold mb-2">👥 RACI 工作流</h2>
            <p className="text-gray-600">權責矩陣與工作流管理</p>
          </Link>
          
          <Link href="/incidents" className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold mb-2">🚨 緊急事件</h2>
            <p className="text-gray-600">Incident 處理與追蹤</p>
          </Link>
        </div>
      </div>
    </main>
  )
}

