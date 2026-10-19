import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Card, CardHeader } from './ui'
import { inr, inrCompact, qty } from '@/lib/format'
import type { Dashboard } from '@/lib/types'

const COLORS = ['#2f6690', '#f28c28', '#10b981', '#8b5cf6', '#ef4444', '#94a3b8']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthLabel = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(2, 4)}`
const money = (v: unknown) => inr(Number(v))

const Empty = ({ text }: { text: string }) => (
  <div className="flex h-64 items-center justify-center text-sm text-slate-400">{text}</div>
)

export default function DashboardCharts({ data }: { data: Dashboard }) {
  const monthly = data.monthly.map((m) => ({ ...m, label: monthLabel(m.month) }))
  const hasMovement = monthly.some((m) => m.in || m.out)
  const totalCat = data.byCategory.reduce((s, c) => s + c.value, 0)

  return (
    <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader title="Stock In vs Stock Out" subtitle="Value per month (last 6 months)" />
        <div className="px-2 pb-4">
          {!hasMovement ? <Empty text="No stock movements in the last 6 months." /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthly} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => inrCompact(v)} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={64} />
                <Tooltip formatter={money} cursor={{ fill: '#f1f5f9' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="in" name="Stock In" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar dataKey="out" name="Stock Out" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Stock Value by Category" subtitle={`Total ${inrCompact(totalCat)}`} />
        <div className="px-2 pb-4">
          {data.byCategory.length === 0 ? <Empty text="No stock yet." /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data.byCategory} dataKey="value" nameKey="category" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {data.byCategory.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={money} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card className="xl:col-span-3">
        <CardHeader title="Top 5 Items Going Out" subtitle="By value, last 90 days" />
        <div className="px-2 pb-4">
          {data.topOut.length === 0 ? <Empty text="No stock out in the last 90 days." /> : (
            <ResponsiveContainer width="100%" height={Math.max(160, data.topOut.length * 44)}>
              <BarChart data={data.topOut} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" tickFormatter={(v) => inrCompact(v)} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 12, fill: '#334155' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  formatter={(v, _n, item) => [`${money(v)} (${qty(item.payload.qty, item.payload.unit)})`, 'Stock Out']}
                />
                <Bar dataKey="amount" fill="#2f6690" radius={[0, 4, 4, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  )
}
