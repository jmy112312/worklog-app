import React, { useState } from "react";

const Modal = ({ children, onClose }) => (
  <div
    className="fixed inset-0 z-20 flex items-center justify-center bg-black bg-opacity-50"
    onClick={onClose}
  >
    <div
      className="w-full max-w-sm p-6 bg-white rounded-lg shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  </div>
);

export const AlertModal = ({ message, onClose }) => (
  <Modal onClose={onClose}>
    <h3 className="text-lg font-medium mb-4">알림</h3>
    <p className="mb-6">{message}</p>
    <div className="flex justify-end">
      <button
        onClick={onClose}
        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
      >
        확인
      </button>
    </div>
  </Modal>
);

export function AddSiteModal({ onAdd, onClose }) {
  const [siteName, setSiteName] = useState("");
  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(siteName);
  };
  return (
    <Modal onClose={onClose}>
      <h3 className="text-lg font-medium mb-4">새 현장 추가</h3>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
          placeholder="현장 이름을 입력하세요"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          autoFocus
        />
        <div className="flex justify-end mt-4 space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            취소
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            추가
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function ConfirmDeleteModal({ onConfirm, onClose, siteName }) {
  return (
    <Modal onClose={onClose}>
      <h3 className="text-lg font-medium mb-4">현장 삭제 확인</h3>
      <p className="mb-6">
        "{siteName}" 현장을 정말로 삭제하시겠습니까? 이 현장과 관련된 모든
        출력일보 데이터가 영구적으로 삭제됩니다.
      </p>
      <div className="flex justify-end mt-4 space-x-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
        >
          취소
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
        >
          삭제
        </button>
      </div>
    </Modal>
  );
}

export function ApprovalModal({ onClose, onConfirm }) {
  const [name, setName] = useState("");
  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(name);
  };
  return (
    <Modal onClose={onClose}>
      <h3 className="text-lg font-medium mb-4">결재자 이름 입력</h3>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          autoFocus
        />
        <div className="flex justify-end mt-4 space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            취소
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700"
          >
            확인
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function ApprovalTitleModal({ currentTitles, onClose, onConfirm }) {
  const [titles, setTitles] = useState(currentTitles.join(", "));
  const handleSubmit = (e) => {
    e.preventDefault();
    const newTitles = titles
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (newTitles.length > 0) {
      onConfirm(newTitles);
    }
  };
  return (
    <Modal onClose={onClose}>
      <h3 className="text-lg font-medium mb-4">결재란 설정</h3>
      <p className="text-sm text-gray-600 mb-2">
        직책을 쉼표(,)로 구분하여 입력하세요.
      </p>
      <p className="text-xs text-gray-500 mb-4">예: 작성자, 팀장, 현장소장</p>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={titles}
          onChange={(e) => setTitles(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          autoFocus
        />
        <div className="flex justify-end mt-4 space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            취소
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            설정
          </button>
        </div>
      </form>
    </Modal>
  );
}
