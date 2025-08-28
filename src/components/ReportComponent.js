// src/components/ReportComponent.js

import React, { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { ApprovalBox } from "./ApprovalBox";
import { AlertModal, ApprovalModal, ApprovalTitleModal } from "./Modals";
import { TrashIcon, SettingsIcon, PrinterIcon } from "./Icons";

export default function ReportComponent({ site, date, user }) {
  const initialWorker = {
    name: "",
    job: "",
    work_day: 0,
    work_night: 0,
    work_full_night: 0,
    description: "",
  };
  const defaultTitles = ["작성자", "담당자", "현장소장"];
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alertMessage, setAlertMessage] = useState("");
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showApprovalTitleModal, setShowApprovalTitleModal] = useState(false);
  const [currentApprovalIndex, setCurrentApprovalIndex] = useState(null);
  const printRef = useRef();

  const fetchReport = async () => {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("site_id", site.id)
      .eq("date", date)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error fetching report:", error);
      setReport(null);
    } else if (data && data.length > 0) {
      const reportData = data[0];
      const filledWorkers = Array(15)
        .fill(null)
        .map(
          (_, i) =>
            (reportData.workers && reportData.workers[i]) || {
              ...initialWorker,
            }
        );
      const titles = reportData.approval_titles || defaultTitles;
      const syncedApprovals = titles.map(
        (_, index) =>
          (reportData.approvals && reportData.approvals[index]) || {
            name: "",
            date: "",
          }
      );
      setReport({
        ...reportData,
        workers: filledWorkers,
        approvals: syncedApprovals,
        approval_titles: titles,
      });
    } else {
      const syncedApprovals = defaultTitles.map(() => ({ name: "", date: "" }));
      setReport({
        id: null,
        work_type: "",
        company_name: "",
        workers: Array(15)
          .fill(null)
          .map(() => ({ ...initialWorker })),
        approvals: syncedApprovals,
        approval_titles: defaultTitles,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!site || !date) return;
    setLoading(true);
    fetchReport();

    const subscription = supabase
      .channel(`public:reports:site_id=eq.${site.id}:date=eq.${date}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reports",
          filter: `site_id=eq.${site.id}`,
        },
        (payload) => {
          fetchReport();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, [site, date]);

  const totals = useMemo(() => {
    if (!report) return { work_day: 0, work_night: 0, work_full_night: 0 };
    return report.workers.reduce(
      (acc, worker) => {
        if (worker.name) {
          acc.work_day += parseFloat(worker.work_day || 0);
          acc.work_night += parseFloat(worker.work_night || 0);
          acc.work_full_night += parseFloat(worker.work_full_night || 0);
        }
        return acc;
      },
      { work_day: 0, work_night: 0, work_full_night: 0 }
    );
  }, [report]);

  const formatHoursForDisplay = (value) => {
    const num = parseFloat(value);
    if (isNaN(num) || num === 0) return "";
    return String(num);
  };

  const handleWorkerChange = (index, field, value) => {
    const newWorkers = [...report.workers];
    newWorkers[index][field] = value === "" ? 0 : value;
    setReport({ ...report, workers: newWorkers });
  };

  const addWorkerRow = () =>
    setReport((prev) => ({
      ...prev,
      workers: [...prev.workers, { ...initialWorker }],
    }));
  const removeWorkerRow = (index) => {
    if (report.workers.length <= 1) return;
    setReport({
      ...report,
      workers: report.workers.filter((_, i) => i !== index),
    });
  };

  const handleSave = async () => {
    let processedWorkers = JSON.parse(JSON.stringify(report.workers));
    processedWorkers.forEach((w) => {
      if (w.name.trim() === "") {
        w.work_day = 0;
        w.work_night = 0;
        w.work_full_night = 0;
      }
    });
    let lastJob = "";
    let lastDescription = "";
    processedWorkers.forEach((worker) => {
      if (worker.job.trim()) lastJob = worker.job;
      if (worker.description.trim()) lastDescription = worker.description;
      if (worker.name.trim()) {
        if (!worker.job.trim()) worker.job = lastJob;
        if (!worker.description.trim()) worker.description = lastDescription;
      }
    });
    const activeWorkers = processedWorkers.filter((w) => w.name.trim() !== "");
    for (const worker of activeWorkers) {
      const totalHours =
        parseFloat(worker.work_day || 0) +
        parseFloat(worker.work_night || 0) +
        parseFloat(worker.work_full_night || 0);
      if (totalHours === 0) {
        setAlertMessage(`${worker.name}님의 근무시간을 기재해주세요.`);
        return;
      }
    }
    const names = activeWorkers.map((w) => w.name.trim());
    if (new Set(names).size !== names.length) {
      setAlertMessage(
        "이름이 중복됩니다. 이름 출생연도로 기재해주세요. 예시: 홍길동60"
      );
      return;
    }
    const workersToSave = processedWorkers.filter((w) => w.name.trim() !== "");

    const reportData = {
      user_id: user.id,
      site_id: site.id,
      date: date,
      site_name: site.name,
      work_type: report.work_type,
      company_name: report.company_name,
      workers: workersToSave,
      approvals: report.approvals,
      approval_titles: report.approval_titles,
    };

    if (report.id) {
      const { error } = await supabase
        .from("reports")
        .update(reportData)
        .eq("id", report.id);
      if (error) {
        console.error("Error updating report:", error);
        setAlertMessage("저장 중 오류가 발생했습니다.");
      } else {
        setAlertMessage("저장되었습니다.");
      }
    } else {
      const { data, error } = await supabase
        .from("reports")
        .insert(reportData)
        .select()
        .single();
      if (error) {
        console.error("Error inserting report:", error);
        setAlertMessage("저장 중 오류가 발생했습니다.");
      } else if (data) {
        setReport((prev) => ({ ...prev, ...data }));
        setAlertMessage("저장되었습니다.");
      }
    }
  };

  const handleApproveClick = () => {
    const nextIndex = report.approvals.findIndex((a) => !a.name);
    if (nextIndex !== -1) {
      setCurrentApprovalIndex(nextIndex);
      setShowApprovalModal(true);
    } else {
      setAlertMessage("모든 결재가 완료되었습니다.");
    }
  };

  const handleConfirmApproval = async (approverName) => {
    if (!approverName.trim()) {
      setAlertMessage("결재자 이름을 입력하세요.");
      return;
    }
    const newApprovals = [...report.approvals];
    const now = new Date();
    const dateString = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    newApprovals[currentApprovalIndex] = {
      name: approverName,
      date: dateString,
    };

    setReport((prev) => ({ ...prev, approvals: newApprovals }));
    setShowApprovalModal(false);

    const { error } = await supabase
      .from("reports")
      .update({ approvals: newApprovals })
      .eq("id", report.id);

    if (error) {
      console.error("Error approving report:", error);
      setAlertMessage("결재 처리 중 오류가 발생했습니다.");
      fetchReport();
    } else {
      setCurrentApprovalIndex(null);
    }
  };

  const handleUpdateApprovalTitles = (newTitles) => {
    const newApprovals = newTitles.map(
      (_, index) => report.approvals[index] || { name: "", date: "" }
    );
    setReport((prev) => ({
      ...prev,
      approval_titles: newTitles,
      approvals: newApprovals,
    }));
    setShowApprovalTitleModal(false);
  };

  const handlePrint = () => {
    const contentNode = printRef.current;
    if (!contentNode) return;

    const clonedNode = contentNode.cloneNode(true);

    const inputs = clonedNode.querySelectorAll(
      'input[type="text"], input[type="number"]'
    );
    inputs.forEach((input) => {
      const textSpan = document.createElement("span");
      textSpan.textContent = input.value || " ";
      textSpan.style.display = "inline-block";
      textSpan.style.width = "100%";
      textSpan.style.textAlign = "center";
      input.parentNode.replaceChild(textSpan, input);
    });

    const printContent = clonedNode.innerHTML;
    const printWindow = window.open("", "", "height=800,width=1200");

    printWindow.document.write("<html><head><title>출력일보 인쇄</title>");
    printWindow.document.write(
      '<script src="https://cdn.tailwindcss.com"></script>'
    );
    printWindow.document.write(`
        <style>
            body { 
                font-family: "Malgun Gothic", sans-serif; 
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            @page {
                size: A4;
                margin: 20mm;
            }
            .no-print { display: none !important; }
            .print-header { text-align: center; }
            .approval-box-print { border: 1px solid #000; }
            .approval-box-print table, .approval-box-print th, .approval-box-print td { border: 1px solid #000; }
            .approval-stamp { color: #E57373; font-weight: bold; border: 2px solid #E57373; border-radius: 50%; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; word-break: keep-all; text-align: center; line-height: 1.1; margin: auto; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 6px; text-align: center; font-size: 10px; }
            th { background-color: #f2f2f2 !important; }
        </style>
    `);
    printWindow.document.write("</head><body><div class='p-6'>");
    printWindow.document.write(printContent);
    printWindow.document.write("</div></body></html>");
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  if (loading || !report)
    return <div className="p-6 bg-white rounded-lg shadow-md">로딩중...</div>;

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      {alertMessage && (
        <AlertModal
          message={alertMessage}
          onClose={() => setAlertMessage("")}
        />
      )}
      <div ref={printRef}>
        <div className="flex justify-between items-start mb-4">
          <div className="info-table text-sm space-y-2">
            <p>
              <strong>일자:</strong> {date}
            </p>
            <p>
              <strong>현장명:</strong> {site.name}
            </p>
            <div className="flex items-center">
              <strong className="whitespace-nowrap mr-2">공종명:</strong>
              <input
                type="text"
                value={report.work_type}
                onChange={(e) =>
                  setReport({ ...report, work_type: e.target.value })
                }
                className="border p-1 rounded w-full"
              />
            </div>
            <div className="flex items-center">
              <strong className="whitespace-nowrap mr-2">업체명:</strong>
              <input
                type="text"
                value={report.company_name}
                onChange={(e) =>
                  setReport({ ...report, company_name: e.target.value })
                }
                className="border p-1 rounded w-full"
              />
            </div>
          </div>
          <div className="flex-grow">
            <h2 className="text-2xl font-bold text-center print-header">
              일 일 출 력 일 보
            </h2>
          </div>
          <div className="flex-shrink-0">
            <ApprovalBox
              approvals={report.approvals}
              approvalTitles={report.approval_titles}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2 w-14" rowSpan="2">
                  번호
                </th>
                <th className="border p-2 w-24" rowSpan="2">
                  직종
                </th>
                <th className="border p-2 w-32" rowSpan="2">
                  성명
                </th>
                <th className="border p-2" colSpan="4">
                  근무시간
                </th>
                <th className="border p-2 w-90" rowSpan="2">
                  작업내용
                </th>
                <th className="border p-2 w-12 no-print" rowSpan="2">
                  삭제
                </th>
              </tr>
              <tr>
                <th className="border p-2 w-12">주간</th>
                <th className="border p-2 w-12">야간</th>
                <th className="border p-2 w-12">철야</th>
                <th className="border p-2 w-12">합계</th>
              </tr>
            </thead>
            <tbody>
              {report.workers.map((worker, index) => {
                const totalHours =
                  parseFloat(worker.work_day || 0) +
                  parseFloat(worker.work_night || 0) +
                  parseFloat(worker.work_full_night || 0);
                return (
                  <tr key={index}>
                    <td className="border p-1 text-center">{index + 1}</td>
                    <td className="border p-1">
                      <input
                        type="text"
                        value={worker.job}
                        onChange={(e) =>
                          handleWorkerChange(index, "job", e.target.value)
                        }
                        className="w-full p-1"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        type="text"
                        value={worker.name}
                        onChange={(e) =>
                          handleWorkerChange(index, "name", e.target.value)
                        }
                        className="w-full p-1"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        type="number"
                        step="0.5"
                        value={formatHoursForDisplay(worker.work_day)}
                        onChange={(e) =>
                          handleWorkerChange(index, "work_day", e.target.value)
                        }
                        className="w-full p-1 text-center"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        type="number"
                        step="0.5"
                        value={formatHoursForDisplay(worker.work_night)}
                        onChange={(e) =>
                          handleWorkerChange(
                            index,
                            "work_night",
                            e.target.value
                          )
                        }
                        className="w-full p-1 text-center"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        type="number"
                        step="0.5"
                        value={formatHoursForDisplay(worker.work_full_night)}
                        onChange={(e) =>
                          handleWorkerChange(
                            index,
                            "work_full_night",
                            e.target.value
                          )
                        }
                        className="w-full p-1 text-center"
                      />
                    </td>
                    <td className="border p-1 text-center">
                      {formatHoursForDisplay(totalHours)}
                    </td>
                    <td className="border p-1">
                      <input
                        type="text"
                        value={worker.description}
                        onChange={(e) =>
                          handleWorkerChange(
                            index,
                            "description",
                            e.target.value
                          )
                        }
                        className="w-full p-1"
                      />
                    </td>
                    <td className="border p-1 text-center no-print">
                      <button
                        onClick={() => removeWorkerRow(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <TrashIcon />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold">
                <td className="border p-2" colSpan="3">
                  합계
                </td>
                <td className="border p-2 text-center">
                  {formatHoursForDisplay(totals.work_day)}
                </td>
                <td className="border p-2 text-center">
                  {formatHoursForDisplay(totals.work_night)}
                </td>
                <td className="border p-2 text-center">
                  {formatHoursForDisplay(totals.work_full_night)}
                </td>
                <td className="border p-2 text-center">
                  {formatHoursForDisplay(
                    totals.work_day + totals.work_night + totals.work_full_night
                  )}
                </td>
                <td className="border p-2"></td>
                <td className="border p-2 no-print"></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <button
          onClick={addWorkerRow}
          className="mt-2 px-2 py-1 text-xs text-white bg-gray-500 rounded hover:bg-gray-600 no-print"
        >
          행 추가
        </button>
      </div>

      <div className="flex flex-wrap justify-end gap-2 sm:gap-4 mt-6 no-print">
        <button
          onClick={() => setShowApprovalTitleModal(true)}
          className="flex items-center px-4 py-2 font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700"
        >
          <SettingsIcon />
          결재란 설정
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center px-4 py-2 font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
        >
          <PrinterIcon /> 인쇄
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-2 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          저장
        </button>
        <button
          onClick={handleApproveClick}
          disabled={!report.id}
          className="px-6 py-2 font-bold text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          결재
        </button>
      </div>
      {showApprovalModal && (
        <ApprovalModal
          onClose={() => setShowApprovalModal(false)}
          onConfirm={handleConfirmApproval}
        />
      )}
      {showApprovalTitleModal && (
        <ApprovalTitleModal
          currentTitles={report.approval_titles}
          onConfirm={handleUpdateApprovalTitles}
          onClose={() => setShowApprovalTitleModal(false)}
        />
      )}
    </div>
  );
}
