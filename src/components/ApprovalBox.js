import React from "react";

export function ApprovalBox({ approvals, approvalTitles }) {
  const getFontSizeClass = (name) => {
    const len = name.length;
    if (len > 4) return "text-[10px]";
    if (len > 3) return "text-xs";
    return "text-sm";
  };

  return (
    <div className="approval-box-print w-[240px]">
      <table className="border-collapse w-full table-fixed">
        <tbody>
          <tr>
            <td
              className="border border-black p-1 text-xs align-middle w-8"
              rowSpan={3}
            >
              결<br />재
            </td>
            {approvalTitles.map((title, index) => (
              <td
                key={index}
                className="border border-black p-1 text-xs text-center"
              >
                {title}
              </td>
            ))}
          </tr>
          <tr>
            {approvalTitles.map((_, index) => {
              const approval = approvals[index] || { name: "", date: "" };
              return (
                <td
                  key={index}
                  className="border border-black h-20 text-center align-middle"
                >
                  {approval.name && (
                    <div className="approval-stamp-wrapper">
                      <div
                        className={`approval-stamp ${getFontSizeClass(
                          approval.name
                        )}`}
                      >
                        {approval.name}
                      </div>
                    </div>
                  )}
                </td>
              );
            })}
          </tr>
          <tr>
            {approvalTitles.map((_, index) => (
              <td
                key={index}
                className="border border-black p-1 text-xs h-6 text-center"
              >
                {(approvals[index] || {}).date}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
