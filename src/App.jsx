import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import RadialMenu from './components/RadialMenu';
import Galaxy from './components/Galaxy';
import Navbar from './components/Navbar';
import './App.css';
import initialData from './data.json';

const GITHUB_OWNER = 'singhaidotnish';
const GITHUB_REPO = 'mymenu-yt';
const GITHUB_FILE_PATH = 'src/data.json';

function App() {
  const [viewMode, setViewMode] = useState('2d');
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({ label: '', url: '', parentId: 'root' });
  const [saveStatus, setSaveStatus] = useState('idle');
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [pendingItems, setPendingItems] = useState(null);

  const [items] = useState(initialData);

  const pushToGithub = async (token, itemsToSave) => {
    setSaveStatus('saving');
    try {
      const getRes = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
      );
      const fileData = await getRes.json();
      const sha = fileData.sha;
      const content = btoa(unescape(encodeURIComponent(JSON.stringify(itemsToSave, null, 2))));
      const putRes = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: '🔗 Update menu links via app', content, sha }),
        }
      );
      if (putRes.ok) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
        setIsAdding(false);
        setNewItem({ label: '', url: '', parentId: 'root' });
      } else {
        console.error('GitHub error:', await putRes.json());
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 4000);
      }
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  };

  const handleSaveToGithub = (e) => {
    e.preventDefault();
    if (!newItem.label) return;

    const newLinkObject = {
      id: Date.now(),
      label: newItem.label,
      url: newItem.url || '#',
      icon: 'link',
      img: null,
      children: newItem.url ? null : [],
    };

    let updatedItems = [...items];
    if (newItem.parentId === 'root') {
      updatedItems.push(newLinkObject);
    } else {
      updatedItems = updatedItems.map(item => {
        if (item.id === newItem.parentId) {
          return { ...item, children: [...(item.children || []), newLinkObject] };
        }
        return item;
      });
    }

    const token = localStorage.getItem('githubToken');
    if (!token) {
      setPendingItems(updatedItems);
      setIsTokenModalOpen(true);
      return;
    }
    pushToGithub(token, updatedItems);
  };

  const handleTokenSave = () => {
    if (!tokenInput.trim()) return;
    localStorage.setItem('githubToken', tokenInput.trim());
    setIsTokenModalOpen(false);
    setTokenInput('');
    if (pendingItems) {
      pushToGithub(tokenInput.trim(), pendingItems);
      setPendingItems(null);
    }
  };

  const handleReset = () => {
    if (confirm('Reset to default? This pushes the original data.json to GitHub.')) {
      const token = localStorage.getItem('githubToken');
      if (!token) { setPendingItems(initialData); setIsTokenModalOpen(true); return; }
      pushToGithub(token, initialData);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'black' }}>

      <Navbar
        is3D={viewMode === '3d'}
        onToggle={() => setViewMode(viewMode === '2d' ? '3d' : '2d')}
        onAddClick={() => setIsAdding(true)}
      />

      <Galaxy showSolarSystem={viewMode === '3d'} items={items} />

      {viewMode === '2d' && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10, pointerEvents: 'none' }}>
          <div style={{ pointerEvents: 'auto', width: '100%', height: '100%' }}>
            <RadialMenu items={items} />
          </div>
        </div>
      )}

      <AnimatePresence>
        {isAdding && (
          <div className="modal-overlay">
            <motion.div className="add-modal" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Add New Link</h3>
                <button onClick={() => setIsAdding(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>✕</button>
              </div>
              <form onSubmit={handleSaveToGithub}>
                <input type="text" placeholder="Label (e.g. Google)" value={newItem.label} onChange={(e) => setNewItem({ ...newItem, label: e.target.value })} autoFocus />
                <input type="url" placeholder="URL (https://...)" value={newItem.url} onChange={(e) => setNewItem({ ...newItem, url: e.target.value })} />
                <div className="select-wrapper">
                  <label>Location:</label>
                  <select value={newItem.parentId} onChange={(e) => setNewItem({ ...newItem, parentId: e.target.value })} className="location-select">
                    <option value="root">🔵 Main Circle</option>
                    {items.map(item => (item.children || !item.url) && <option key={item.id} value={item.id}>📂 Inside: {item.label}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <button type="submit" className="save-btn" disabled={saveStatus === 'saving'}>
                    {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? '✓ Saved!' : saveStatus === 'error' ? '✗ Failed' : '💾 Save to GitHub'}
                  </button>
                  <button type="button" className="reset-btn" onClick={handleReset}>Reset</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isTokenModalOpen && (
          <div className="modal-overlay">
            <motion.div className="add-modal" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>GitHub Token</h3>
                <button onClick={() => setIsTokenModalOpen(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>✕</button>
              </div>
              <p style={{ fontSize: '12px', color: '#888', margin: '8px 0 16px' }}>
                One-time setup. Fine-grained token with <strong style={{ color: '#ffaa00' }}>Contents: Read &amp; Write</strong>. Stored in your browser only.
              </p>
              <input type="password" placeholder="github_pat_..." value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} autoFocus onKeyDown={(e) => e.key === 'Enter' && handleTokenSave()} />
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button className="save-btn" onClick={handleTokenSave}>Save &amp; Continue</button>
                <button className="reset-btn" onClick={() => { localStorage.removeItem('githubToken'); setIsTokenModalOpen(false); }}>Clear Token</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default App;
