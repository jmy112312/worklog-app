import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { SearchIcon } from "./Icons";

export default function WorkerSearch({ site, user }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [totalHours, setTotalHours] = useState({
    work_day: 0,
    work_night: 0,
    work_full_night: 0,
  });
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (searchTerm.trim() === "") {
      setResults([]);
      return;
    }
    setIsSearching(true);
    setResults([]);
    setTotalHours({ work_day: 0, work_night: 0, work_full_night: 0 });

    const { data, error } = await supabase
      .from("reports")
      .select("date, workers")
      .eq("site_id", site.id);

    if (error) {
      console.error("Error searching reports:", error);
    } else {
      const foundReports = [];
      let totals = { work_day: 0, work_night: 0, work_full_night: 0 };
      data.forEach((report) => {
        if (report.workers && Array.isArray(report.workers)) {
          const dailyWork = report.workers
            .filter((w) => w.name && w.name.includes(searchTerm))
            .reduce(
              (acc, w) => {
                acc.work_day += parseFloat(w.work_day || 0);
                acc.work_night += parseFloat(w.work_night || 0);
                acc.work_full_night += parseFloat(w.work_full_night || 0);
                return acc;
              },
              { work_day: 0, work_night: 0, work_full_night: 0 }
            );

          if (
            dailyWork.work_day > 0 ||
            dailyWork.work_night > 0 ||
            dailyWork.work_full_night > 0
          ) {
            foundReports.push({ date: report.date, ...dailyWork });
            totals.work_day += dailyWork.work_day;
            totals.work_night += dailyWork.work_night;
            totals.work_full_night += dailyWork.work_full_night;
          }
        }
      });
      setResults(
        foundReports.sort((a, b) => new Date(b.date) - new Date(a.date))
      );
      setTotalHours(totals);
    }
    setIsSearching(false);
  };

  return (
    <div className="mt-6 pt-6 border-t">
      <h3 className="text-lg font-semibold mb-3">작업자별 출력일 조회</h3>
      <div className="relative">
        <input
          type="text"
          placeholder="작업자 이름 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-md"
        />
        <div className="absolute inset-y-0 left-0 flex items-center pl-3">
          <SearchIcon />
        </div>
      </div>
      <button
        onClick={handleSearch}
        className="w-full px-4 py-2 mt-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700"
      >
        {isSearching ? "검색중..." : "검색"}
      </button>
      <div className="mt-4">
        {results.length > 0 ? (
          <>
            <p className="font-semibold mb-2 text-sm">
              "{searchTerm}" 검색결과 (총 주간: {totalHours.work_day.toFixed(1)}
              , 야간: {totalHours.work_night.toFixed(1)}, 철야:{" "}
              {totalHours.work_full_night.toFixed(1)})
            </p>
            <ul className="max-h-48 overflow-y-auto space-y-1 text-sm">
              {results.map((r) => (
                <li key={r.date}>
                  {r.date}: (주간: {r.work_day.toFixed(1)}, 야간:{" "}
                  {r.work_night.toFixed(1)}, 철야:{" "}
                  {r.work_full_night.toFixed(1)})
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-gray-500">
            {isSearching ? "" : "검색 결과가 없습니다."}
          </p>
        )}
      </div>
    </div>
  );
}
