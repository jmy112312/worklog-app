import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import ReportComponent from "./ReportComponent";
import WorkerSearch from "./WorkerSearch";
import { AddSiteModal, ConfirmDeleteModal } from "./Modals";
import { PlusIcon, LogoutIcon, TrashIcon } from "./Icons";

export default function DailyReportManager({ user }) {
  const [sites, setSites] = useState([]);
  const [currentSite, setCurrentSite] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchSites = async () => {
    const { data, error } = await supabase
      .from("sites")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching sites:", error);
    } else {
      setSites(data);
      if (currentSite) {
        if (!data.some((s) => s.id === currentSite.id)) {
          setCurrentSite(data[0] || null);
        }
      } else if (data.length > 0) {
        setCurrentSite(data[0]);
      }
    }
  };

  useEffect(() => {
    fetchSites();
    const subscription = supabase
      .channel("public:sites")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sites" },
        (payload) => {
          fetchSites();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, [user]);

  const addSite = async (siteName) => {
    if (siteName.trim() === "") return;
    const { data, error } = await supabase
      .from("sites")
      .insert({ name: siteName, user_id: user.id })
      .select();
    if (error) {
      console.error("Error adding site:", error);
    } else if (data) {
      setCurrentSite(data[0]);
    }
    setShowSiteModal(false);
  };

  const handleDeleteSite = async () => {
    if (!currentSite) return;
    const { error } = await supabase
      .from("sites")
      .delete()
      .eq("id", currentSite.id);
    if (error) {
      console.error("Error deleting site:", error);
    } else {
      const newSites = sites.filter((s) => s.id !== currentSite.id);
      setCurrentSite(newSites[0] || null);
    }
    setShowDeleteConfirm(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between pb-4 mb-6 border-b">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
          출력일보 관리 시스템
        </h1>
        <div className="flex items-center space-x-2 sm:space-x-4 mt-2 sm:mt-0">
          <span className="text-sm text-gray-600 hidden md:block">
            사용자: {user.email}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            <LogoutIcon /> 로그아웃
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">현장 및 날짜 선택</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  현장
                </label>
                <select
                  value={currentSite?.id || ""}
                  onChange={(e) =>
                    setCurrentSite(sites.find((s) => s.id === e.target.value))
                  }
                  className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                  {sites.length === 0 && (
                    <option disabled>현장을 추가해주세요</option>
                  )}
                </select>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    onClick={() => setShowSiteModal(true)}
                    className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                  >
                    <PlusIcon /> 새 현장 추가
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={!currentSite}
                    className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 disabled:bg-gray-400"
                  >
                    <TrashIcon /> 현장 삭제
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  날짜
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            {currentSite && <WorkerSearch site={currentSite} user={user} />}
          </div>
        </div>
        <div className="lg:col-span-2">
          {currentSite ? (
            <ReportComponent
              site={currentSite}
              date={selectedDate}
              user={user}
            />
          ) : (
            <div className="flex items-center justify-center h-full p-6 bg-white rounded-lg shadow-md">
              <p className="text-gray-500">
                관리할 현장을 선택하거나 새로 추가해주세요.
              </p>
            </div>
          )}
        </div>
      </div>
      {showSiteModal && (
        <AddSiteModal onAdd={addSite} onClose={() => setShowSiteModal(false)} />
      )}
      {showDeleteConfirm && (
        <ConfirmDeleteModal
          onConfirm={handleDeleteSite}
          onClose={() => setShowDeleteConfirm(false)}
          siteName={currentSite?.name}
        />
      )}
    </div>
  );
}
