import { RouterProvider } from 'react-router';
import { router } from './routes';
import { PrintErrorModal } from './components/PrintErrorModal';
import { AppToaster } from './components/AppToaster';

export default function App() {
  return <><RouterProvider router={router} /><PrintErrorModal /><AppToaster /></>;
}
