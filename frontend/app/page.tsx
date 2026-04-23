import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-6">
      <h1 className="text-white text-3xl font-bold">Human Detector</h1>
      <div className="flex gap-4">
        <Link
          href="/camera"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
        >
          Kamera
        </Link>
        <Link
          href="/warning"
          className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold"
        >
          Uyarı Ekranı
        </Link>
      </div>
    </div>
  );
}
