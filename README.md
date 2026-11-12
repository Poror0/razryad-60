# РАЗРЯД 60

Концепт продуктовой страницы механической клавиатуры с 3D-разборкой при скролле: кейкапы поднимаются и разлетаются, открываются hot-swap свитчи, камера наезжает на разобранный свитч, затем на алюминиевый корпус, и клавиатура собирается обратно в финальный ракурс у блока покупки.

> Концепт для портфолио. Бренд и товар вымышленные.

**Демо:** скоро

## Стек

- [Vite](https://vite.dev), [React](https://react.dev), TypeScript
- [Three.js](https://threejs.org), [React Three Fiber](https://r3f.docs.pmnd.rs), [drei](https://drei.docs.pmnd.rs)
- [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) + [Lenis](https://lenis.darkroom.engineering) — анимация, привязанная к прокрутке
- [postprocessing](https://github.com/pmndrs/postprocessing) / `@react-three/postprocessing`, [N8AO](https://github.com/N8python/n8ao) — AO, selective bloom, глубина резкости

## Запуск

```bash
npm i
npm run dev      # dev-сервер на http://localhost:5173
npm run build    # проверка типов и production-сборка в dist/
npm run preview  # просмотр сборки
```

## Устройство

```
src/
  content/      тексты этапов, выносок и секций страницы
  scroll/       таймлайн прокрутки (GSAP + Lenis) и общее состояние анимации
  three/        сцена: модели, перекраска, камера, свет, эффекты, проекция выносок
  ui/           хедер, панели этапов, секции, звук нажатия (Web Audio)
  dev/          страница рендеров для карточек комплектации
public/
  models/       подготовленные модели (glb) и их лицензии
  renders/      статичные рендеры для карточек комплектации
scripts/
  prepare-models.mjs   исходники моделей → public/models (разрезка кейкапов, оптимизация)
  renders.mjs          public/renders из наших моделей (нужен запущенный dev-сервер)
```

Состояние анимации хранится в обычном объекте, который пишет таймлайн и читает `useFrame`, без React-state, поэтому прокрутка не вызывает ре-рендеров. На слабых устройствах эффекты отключаются ступенчато (PerformanceMonitor), на телефонах сцена упрощена. `prefers-reduced-motion` убирает инерцию прокрутки, покачивание модели и мерцание фона.

### Пересборка моделей

Исходники в репозиторий не входят. Скачайте обе модели (ссылки ниже) в формате glTF и распакуйте в `models/_source/custom_mechanical_keyboard/` и `models/_source/cherry_mx_switches/`, затем:

```bash
node scripts/prepare-models.mjs
```

Рендеры для карточек комплектации: `npm run dev`, затем `node scripts/renders.mjs`.

## Credits

3D models: "Custom - Mechanical Keyboard" (https://skfb.ly/oDNzq) by unknown.fbx; "Cherry MX Switches" (https://skfb.ly/ovvxx) by BlackCube — licensed under CC BY 4.0 (http://creativecommons.org/licenses/by/4.0/).

Модели перекрашены и разрезаны на части: кейкапы отделены друг от друга, из набора свитчей извлечён один и собран заново, декоративные элементы текстуры кейкапов закрашены. Тексты лицензий: [`public/models/`](public/models/).

Шрифты Unbounded, Onest и JetBrains Mono распространяются по SIL Open Font License и подключены через Fontsource.
