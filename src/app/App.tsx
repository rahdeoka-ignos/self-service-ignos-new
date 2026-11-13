import { RouterProvider } from 'react-router';
import { router } from './routes';
import { PrintErrorModal } from './components/PrintErrorModal';

export default function App() {
  return <><RouterProvider router={router} /><PrintErrorModal /></>;
}
