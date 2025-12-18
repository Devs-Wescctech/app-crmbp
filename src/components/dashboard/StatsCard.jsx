import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

const colorClasses = {
  blue: {
    gradient: "from-blue-500 to-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950",
    text: "text-blue-600 dark:text-blue-400",
    ring: "ring-blue-100 dark:ring-blue-900"
  },
  purple: {
    gradient: "from-purple-500 to-purple-600",
    bg: "bg-purple-50 dark:bg-purple-950",
    text: "text-purple-600 dark:text-purple-400",
    ring: "ring-purple-100 dark:ring-purple-900"
  },
  green: {
    gradient: "from-green-500 to-green-600",
    bg: "bg-green-50 dark:bg-green-950",
    text: "text-green-600 dark:text-green-400",
    ring: "ring-green-100 dark:ring-green-900"
  },
  orange: {
    gradient: "from-orange-500 to-orange-600",
    bg: "bg-orange-50 dark:bg-orange-950",
    text: "text-orange-600 dark:text-orange-400",
    ring: "ring-orange-100 dark:ring-orange-900"
  },
  red: {
    gradient: "from-red-500 to-red-600",
    bg: "bg-red-50 dark:bg-red-950",
    text: "text-red-600 dark:text-red-400",
    ring: "ring-red-100 dark:ring-red-900"
  },
  indigo: {
    gradient: "from-indigo-500 to-indigo-600",
    bg: "bg-indigo-50 dark:bg-indigo-950",
    text: "text-indigo-600 dark:text-indigo-400",
    ring: "ring-indigo-100 dark:ring-indigo-900"
  },
};

export default function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  color = "blue", 
  trend, 
  trendUp,
  subtitle,
  pulse = false 
}) {
  const colors = colorClasses[color];

  return (
    <Card className={`relative overflow-hidden border-none shadow-sm hover:shadow-lg transition-all duration-300 ${colors.bg} ${pulse ? 'animate-pulse' : ''}`}>
      <div className={`absolute top-0 right-0 w-32 h-32 transform translate-x-16 -translate-y-16 bg-gradient-to-br ${colors.gradient} rounded-full opacity-10`} />
      
      <CardHeader className="p-5 relative">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
              {title}
            </p>
            <CardTitle className={`text-3xl font-bold ${colors.text} mb-1`}>
              {value}
            </CardTitle>
            
            {trend && (
              <div className="flex items-center mt-2 text-xs">
                {trendUp ? (
                  <TrendingUp className="w-3 h-3 mr-1 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1 text-red-600 dark:text-red-400" />
                )}
                <span className={trendUp ? "text-green-600 dark:text-green-400 font-medium" : "text-red-600 dark:text-red-400 font-medium"}>
                  {trend}
                </span>
              </div>
            )}
            
            {subtitle && !trend && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {subtitle}
              </p>
            )}
          </div>
          
          <div className={`p-3 rounded-xl bg-gradient-to-br ${colors.gradient} shadow-lg ring-4 ${colors.ring}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}