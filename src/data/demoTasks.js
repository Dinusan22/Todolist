export const DEMO_STORAGE_KEY = 'todo-minimal-demo-v1';
export const demoTasks = [
  { id: 'demo-1', title: 'Finish the lab report', description: 'Review the screenshots, check the calculations and write a clear conclusion.', isCompleted: false },
  { id: 'demo-2', title: 'Build the to-do frontend', description: 'Create the Minimal list layout and connect it to the Spring Boot API.', isCompleted: false },
  { id: 'demo-3', title: 'Revise Java concepts', description: 'Practice classes, interfaces and exceptions with a few small examples.', isCompleted: false },
  { id: 'demo-4', title: 'Test the API endpoints', description: 'Check create, update and delete requests in Postman.', isCompleted: true },
  { id: 'demo-5', title: 'Complete the backend', description: 'Set up the task endpoints and JWT login.', isCompleted: true },
];

export function loadDemoTasks() {
  try {
    const value = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY));
    if (Array.isArray(value) && value.every((task) => task && typeof task.id === 'string' && typeof task.title === 'string' && typeof task.description === 'string' && typeof task.isCompleted === 'boolean')) return value;
  } catch { /* Private browsing or an old saved format: start with sample tasks. */ }
  return demoTasks.map((task) => ({ ...task }));
}
