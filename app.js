/* ============================================
   DECO MY TREE - JavaScript Application
   A festive Christmas tree decoration app
   With Firebase Backend for sharing
   ============================================ */

// ============================================
// Firebase Configuration
// ============================================
// TODO: Replace with your own Firebase config from https://console.firebase.google.com/
const firebaseConfig = {
    apiKey: "AIzaSyBwnWcy7CXsccCWeYbchNf-qwEh2oMrYu8",
    authDomain: "decomytree-67c8a.firebaseapp.com",
    databaseURL: "https://decomytree-67c8a-default-rtdb.firebaseio.com",
    projectId: "decomytree-67c8a",
    storageBucket: "decomytree-67c8a.firebasestorage.app",
    messagingSenderId: "470905124572",
    appId: "1:470905124572:web:3c7c9f0bfb45104051e619",
    measurementId: "G-M60F2S457S"
};

// Initialize Firebase
let database;
let firebaseInitialized = false;

try {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    firebaseInitialized = true;
    console.log('Firebase initialized successfully');
} catch (error) {
    console.warn('Firebase not configured. Using local storage fallback:', error);
    firebaseInitialized = false;
}

// ============================================
// Global State
// ============================================
let currentTree = null;
let selectedOrnament = '🔴';
let trees = {}; // Local cache

// ============================================
// Initialize App
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    createSnowfall();
    checkUrlForTreeCode();
});

// ============================================
// Snowfall Effect
// ============================================
function createSnowfall() {
    const snowfall = document.getElementById('snowfall');
    const snowflakes = ['❄', '❅', '❆', '•'];
    
    for (let i = 0; i < 50; i++) {
        const snowflake = document.createElement('div');
        snowflake.className = 'snowflake';
        snowflake.textContent = snowflakes[Math.floor(Math.random() * snowflakes.length)];
        snowflake.style.left = Math.random() * 100 + 'vw';
        snowflake.style.animationDuration = (Math.random() * 5 + 5) + 's';
        snowflake.style.animationDelay = (Math.random() * 10) + 's';
        snowflake.style.fontSize = (Math.random() * 10 + 8) + 'px';
        snowflake.style.opacity = Math.random() * 0.6 + 0.4;
        snowfall.appendChild(snowflake);
    }
}

// ============================================
// Page Navigation
// ============================================
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.add('hidden');
    });
    document.getElementById(pageId).classList.remove('hidden');
}

function showLanding() {
    showPage('landing-page');
    currentTree = null;
}

function showCreateTree() {
    showPage('create-page');
    document.getElementById('owner-name').value = '';
    document.getElementById('tree-name').value = '';
}

function showViewTree() {
    showPage('view-input-page');
    document.getElementById('tree-code').value = '';
}

function showTreePage() {
    showPage('tree-page');
}

// ============================================
// Firebase Database Functions
// ============================================
async function saveTreeToFirebase(tree) {
    if (!firebaseInitialized) {
        saveTreeToLocalStorage(tree);
        return;
    }
    
    try {
        await database.ref('trees/' + tree.code).set(tree);
        console.log('Tree saved to Firebase:', tree.code);
    } catch (error) {
        console.error('Error saving to Firebase:', error);
        saveTreeToLocalStorage(tree);
    }
}

async function getTreeFromFirebase(code) {
    if (!firebaseInitialized) {
        return getTreeFromLocalStorage(code);
    }
    
    try {
        const snapshot = await database.ref('trees/' + code).once('value');
        const tree = snapshot.val();
        if (tree) {
            console.log('Tree loaded from Firebase:', code);
            return tree;
        }
        return null;
    } catch (error) {
        console.error('Error loading from Firebase:', error);
        return getTreeFromLocalStorage(code);
    }
}

async function updateTreeOrnaments(tree) {
    if (!firebaseInitialized) {
        saveTreeToLocalStorage(tree);
        return;
    }
    
    try {
        await database.ref('trees/' + tree.code + '/ornaments').set(tree.ornaments);
        console.log('Ornaments updated in Firebase');
    } catch (error) {
        console.error('Error updating ornaments:', error);
        saveTreeToLocalStorage(tree);
    }
}

// Subscribe to real-time updates for a tree
function subscribeToTreeUpdates(code) {
    if (!firebaseInitialized) return;
    
    database.ref('trees/' + code + '/ornaments').on('value', (snapshot) => {
        const ornaments = snapshot.val();
        if (ornaments && currentTree && currentTree.code === code) {
            currentTree.ornaments = Array.isArray(ornaments) ? ornaments : Object.values(ornaments);
            renderOrnaments(currentTree);
            updateOrnamentCount();
        }
    });
}

function unsubscribeFromTreeUpdates(code) {
    if (!firebaseInitialized) return;
    database.ref('trees/' + code + '/ornaments').off();
}

// ============================================
// Local Storage Fallback
// ============================================
function saveTreeToLocalStorage(tree) {
    try {
        const stored = localStorage.getItem('decomytree_trees');
        const trees = stored ? JSON.parse(stored) : {};
        trees[tree.code] = tree;
        localStorage.setItem('decomytree_trees', JSON.stringify(trees));
    } catch (e) {
        console.error('Could not save to localStorage:', e);
    }
}

function getTreeFromLocalStorage(code) {
    try {
        const stored = localStorage.getItem('decomytree_trees');
        if (stored) {
            const trees = JSON.parse(stored);
            return trees[code] || null;
        }
    } catch (e) {
        console.error('Could not load from localStorage:', e);
    }
    return null;
}

// ============================================
// Tree Management
// ============================================
function generateTreeCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

async function createTree() {
    const ownerName = document.getElementById('owner-name').value.trim() || 'Anonymous';
    const treeName = document.getElementById('tree-name').value.trim() || 'My Christmas Tree';
    
    const treeCode = generateTreeCode();
    
    const tree = {
        code: treeCode,
        ownerName: ownerName,
        treeName: treeName,
        ornaments: [],
        createdAt: new Date().toISOString()
    };
    
    showToast('🎄 Creating your tree...');
    
    await saveTreeToFirebase(tree);
    
    currentTree = tree;
    displayTree(tree);
    subscribeToTreeUpdates(treeCode);
    showTreePage();
    
    showToast('🎄 Tree created successfully!');
}

async function visitTree() {
    const code = document.getElementById('tree-code').value.trim().toUpperCase();
    
    if (!code) {
        showToast('Please enter a tree code');
        return;
    }
    
    showToast('🔍 Looking for tree...');
    
    const tree = await getTreeFromFirebase(code);
    
    if (tree) {
        currentTree = tree;
        displayTree(currentTree);
        subscribeToTreeUpdates(code);
        showTreePage();
        showToast(`🎄 Welcome to ${tree.ownerName}'s tree!`);
    } else {
        showToast('Tree not found. Check the code and try again.');
    }
}

function displayTree(tree) {
    document.getElementById('display-tree-name').textContent = tree.treeName;
    document.getElementById('display-owner-name').textContent = `by ${tree.ownerName}`;
    
    renderOrnaments(tree);
    updateOrnamentCount();
}

// ============================================
// Ornament System
// ============================================
function selectOrnament(element) {
    document.querySelectorAll('.ornament-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    element.classList.add('selected');
    selectedOrnament = element.dataset.ornament;
}

async function addOrnament() {
    if (!currentTree) return;
    
    const message = document.getElementById('ornament-message').value.trim();
    const decoratorName = document.getElementById('decorator-name').value.trim() || 'Anonymous';
    
    // Generate random position on the tree
    const position = getRandomTreePosition();
    
    const ornament = {
        id: Date.now(),
        emoji: selectedOrnament,
        message: message,
        decoratorName: decoratorName,
        x: position.x,
        y: position.y,
        addedAt: new Date().toISOString()
    };
    
    // Initialize ornaments array if it doesn't exist
    if (!currentTree.ornaments) {
        currentTree.ornaments = [];
    }
    
    currentTree.ornaments.push(ornament);
    
    // Save to Firebase
    await updateTreeOrnaments(currentTree);
    
    renderOrnament(ornament);
    updateOrnamentCount();
    
    // Clear inputs
    document.getElementById('ornament-message').value = '';
    document.getElementById('decorator-name').value = '';
    
    showToast('✨ Ornament added!');
}

function getRandomTreePosition() {
    // Define tree shape bounds (triangular shape)
    // The tree is roughly triangular, so we need to position within bounds
    const treeHeight = 220; // Height of tree area
    const treeStartY = 20;
    
    // Random Y position
    const y = Math.random() * treeHeight + treeStartY;
    
    // Calculate X range based on Y (wider at bottom)
    const progress = (y - treeStartY) / treeHeight;
    const maxWidth = 30 + (progress * 120); // Starts narrow, gets wider
    const centerX = 100; // Center of tree
    
    const x = centerX + (Math.random() - 0.5) * maxWidth;
    
    return { x: Math.max(25, Math.min(175, x)), y: Math.min(215, y) };
}

function renderOrnaments(tree) {
    const container = document.getElementById('ornaments-container');
    container.innerHTML = '';
    
    if (tree.ornaments && Array.isArray(tree.ornaments)) {
        tree.ornaments.forEach(ornament => {
            renderOrnament(ornament);
        });
    }
}

function renderOrnament(ornament) {
    const container = document.getElementById('ornaments-container');
    
    const ornamentEl = document.createElement('div');
    ornamentEl.className = 'ornament';
    ornamentEl.textContent = ornament.emoji;
    ornamentEl.style.left = ornament.x + 'px';
    ornamentEl.style.top = ornament.y + 'px';
    ornamentEl.style.transform = 'translate(-50%, -50%)';
    
    if (ornament.message) {
        ornamentEl.style.cursor = 'pointer';
        ornamentEl.title = 'Click to read message';
        ornamentEl.onclick = () => showMessage(ornament);
    }
    
    container.appendChild(ornamentEl);
}

function updateOrnamentCount() {
    if (!currentTree) return;
    const count = currentTree.ornaments ? currentTree.ornaments.length : 0;
    document.getElementById('ornament-count').textContent = 
        count === 1 ? '1 ornament' : `${count} ornaments`;
}

// ============================================
// Share Functionality
// ============================================
function shareTree() {
    if (!currentTree) return;
    
    document.getElementById('share-code').textContent = currentTree.code;
    
    const baseUrl = window.location.origin + window.location.pathname;
    const shareLink = `${baseUrl}?tree=${currentTree.code}`;
    document.getElementById('share-link').value = shareLink;
    
    document.getElementById('share-modal').classList.remove('hidden');
}

function closeShareModal() {
    document.getElementById('share-modal').classList.add('hidden');
}

function copyCode() {
    const code = currentTree.code;
    navigator.clipboard.writeText(code).then(() => {
        showToast('📋 Code copied!');
    }).catch(() => {
        showToast('Could not copy code');
    });
}

function copyLink() {
    const link = document.getElementById('share-link').value;
    navigator.clipboard.writeText(link).then(() => {
        showToast('🔗 Link copied!');
    }).catch(() => {
        showToast('Could not copy link');
    });
}

// ============================================
// Message Modal
// ============================================
function showMessage(ornament) {
    document.getElementById('modal-ornament').textContent = ornament.emoji;
    document.getElementById('modal-message').textContent = ornament.message || 'No message';
    document.getElementById('modal-from').textContent = `- ${ornament.decoratorName}`;
    
    document.getElementById('message-modal').classList.remove('hidden');
}

function closeMessageModal() {
    document.getElementById('message-modal').classList.add('hidden');
}

// ============================================
// Toast Notifications
// ============================================
function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-message').textContent = message;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// ============================================
// URL Handling
// ============================================
async function checkUrlForTreeCode() {
    const urlParams = new URLSearchParams(window.location.search);
    const treeCode = urlParams.get('tree');
    
    if (treeCode) {
        showToast('🔍 Loading tree...');
        const tree = await getTreeFromFirebase(treeCode.toUpperCase());
        if (tree) {
            currentTree = tree;
            displayTree(currentTree);
            subscribeToTreeUpdates(treeCode.toUpperCase());
            showTreePage();
        } else {
            showToast('Tree not found');
        }
    }
}

// ============================================
// Modal Close on Outside Click
// ============================================
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.add('hidden');
    }
});

// ============================================
// Keyboard Shortcuts
// ============================================
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
    }
});

// ============================================
// Cleanup on page unload
// ============================================
window.addEventListener('beforeunload', () => {
    if (currentTree) {
        unsubscribeFromTreeUpdates(currentTree.code);
    }
});
