import { useState } from 'react';
import { api } from '../lib/api';
import { getDevUser } from '../lib/supabase';

export function Home() {
  const [formData, setFormData] = useState({
    time_of_day: '12:00',
    topic: '',
    bg_color: '#FF5733',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Используем getDevUser вместо supabase.auth.getUser()
    const user = await getDevUser();

    if (!user) {
      alert('Войдите в систему');
      return;
    }

    try {
      await api.post('/api/schedule/daily', {
        user_id: user.id,
        formData
      });
      alert('Расписание создано!');
    } catch (error) {
      console.error(error);
      alert('Ошибка создания расписания');
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Создать расписание постов</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Время публикации
          </label>
          <input
            type="time"
            value={formData.time_of_day}
            onChange={e => setFormData({ ...formData, time_of_day: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Тема постов
          </label>
          <input
            type="text"
            value={formData.topic}
            onChange={e => setFormData({ ...formData, topic: e.target.value })}
            placeholder="Психология и отношения"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Цвет фона
          </label>
          <div className="flex gap-4">
            <input
              type="color"
              value={formData.bg_color}
              onChange={e => setFormData({ ...formData, bg_color: e.target.value })}
              className="w-20 h-12 border rounded cursor-pointer"
            />
            <input
              type="text"
              value={formData.bg_color}
              onChange={e => setFormData({ ...formData, bg_color: e.target.value })}
              placeholder="#FF5733"
              className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Выберите цвет фона для постов
          </p>
        </div>

        <button
          type="submit"
          className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition"
        >
          Создать расписание
        </button>
      </form>

      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-3">Как это работает?</h2>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">1.</span>
            <span>Выберите время ежедневной публикации</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">2.</span>
            <span>Укажите тему для постов (например, "Психология")</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">3.</span>
            <span>Настройте цвет фона изображений</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">4.</span>
            <span>Приложение автоматически создаст и опубликует посты по расписанию</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
