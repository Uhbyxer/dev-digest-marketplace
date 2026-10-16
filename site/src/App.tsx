import { useEffect } from 'react';
import { AppProvider } from './lib/app';
import { useCatalog } from './lib/catalog';
import { useRoute } from './lib/router';
import { CompareTray, Header, NotFound, Toast } from './components/Chrome';
import Home from './routes/Home';
import PluginPage from './routes/Plugin';
import ArtifactPage from './routes/Artifact';
import WhatsNew from './routes/WhatsNew';
import Compare from './routes/Compare';
import Contribute from './routes/Contribute';

function Shell() {
  const route = useRoute();
  const [head, a, b, c] = route.parts;
  const section = head ?? 'home';

  // Scroll to top on navigation between pages (not on in-page search updates).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [section, a, b, c]);

  let view;
  switch (section) {
    case 'home':
      view = <Home route={route} />;
      break;
    case 'plugin':
      view = <PluginPage id={a ?? ''} />;
      break;
    case 'artifact':
      view = <ArtifactPage plugin={a ?? ''} type={b ?? ''} name={c ?? ''} />;
      break;
    case 'whats-new':
      view = <WhatsNew />;
      break;
    case 'compare':
      view = <Compare route={route} />;
      break;
    case 'contribute':
      view = <Contribute />;
      break;
    default:
      view = <NotFound what="Page" />;
  }
  useEffect(() => {
    document.title = 'Dev Digest Marketplace';
  }, [section]);

  return (
    <>
      <Header section={section} />
      <main className="main">{view}</main>
      <CompareTray visible={section !== 'compare'} />
      <Toast />
    </>
  );
}

export default function App() {
  const state = useCatalog();
  if (state.status === 'loading') return <p className="boot">Loading catalog…</p>;
  if (state.status === 'error')
    return (
      <p className="boot" role="alert">
        Could not load the catalog ({state.message}). Try reloading the page.
      </p>
    );
  return (
    <AppProvider catalog={state.catalog}>
      <Shell />
    </AppProvider>
  );
}
