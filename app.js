/* ============================================
   Quantum Hardware Interactive Lab — Core Engine
   ============================================ */

// ============ NAVIGATION ============
// Use event delegation on the sidebar to handle clicks on child spans
document.getElementById('sidebar').addEventListener('click', (e) => {
    const item = e.target.closest('.nav-item');
    if (!item) return;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.lab-section').forEach(s => s.classList.remove('active'));
    item.classList.add('active');
    const labId = item.dataset.lab;
    document.getElementById('lab-' + labId).classList.add('active');
});

// ============ UTILITY FUNCTIONS ============
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function complexMul(a, b) {
    return [a[0]*b[0] - a[1]*b[1], a[0]*b[1] + a[1]*b[0]];
}

function complexAdd(a, b) { return [a[0]+b[0], a[1]+b[1]]; }

function complexAbs2(a) { return a[0]*a[0] + a[1]*a[1]; }

// Small matrix eigenvalue solver for real symmetric matrices (Jacobi iteration)
function eigenSymmetric(matrix, size) {
    const n = size;
    // Copy matrix
    const A = [];
    for (let i = 0; i < n; i++) {
        A[i] = [];
        for (let j = 0; j < n; j++) {
            A[i][j] = matrix[i][j];
        }
    }
    
    // Initialize eigenvector matrix as identity
    const V = [];
    for (let i = 0; i < n; i++) {
        V[i] = new Array(n).fill(0);
        V[i][i] = 1;
    }
    
    const maxIter = 100;
    for (let iter = 0; iter < maxIter; iter++) {
        // Find largest off-diagonal
        let maxVal = 0, p = 0, q = 1;
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                if (Math.abs(A[i][j]) > maxVal) {
                    maxVal = Math.abs(A[i][j]);
                    p = i; q = j;
                }
            }
        }
        if (maxVal < 1e-12) break;
        
        // Compute rotation
        const theta = 0.5 * Math.atan2(2 * A[p][q], A[q][q] - A[p][p]);
        const c = Math.cos(theta), s = Math.sin(theta);
        
        // Rotate A
        const App = A[p][p], Aqq = A[q][q], Apq = A[p][q];
        A[p][p] = c*c*App - 2*s*c*Apq + s*s*Aqq;
        A[q][q] = s*s*App + 2*s*c*Apq + c*c*Aqq;
        A[p][q] = 0; A[q][p] = 0;
        
        for (let i = 0; i < n; i++) {
            if (i !== p && i !== q) {
                const Aip = A[i][p], Aiq = A[i][q];
                A[i][p] = c*Aip - s*Aiq;
                A[p][i] = A[i][p];
                A[i][q] = s*Aip + c*Aiq;
                A[q][i] = A[i][q];
            }
        }
        
        // Rotate V
        for (let i = 0; i < n; i++) {
            const Vip = V[i][p], Viq = V[i][q];
            V[i][p] = c*Vip - s*Viq;
            V[i][q] = s*Vip + c*Viq;
        }
    }
    
    // Extract eigenvalues
    const eigenvalues = [];
    for (let i = 0; i < n; i++) eigenvalues.push(A[i][i]);
    
    // Sort by eigenvalue
    const indices = eigenvalues.map((v, i) => i);
    indices.sort((a, b) => eigenvalues[a] - eigenvalues[b]);
    
    const sortedVals = indices.map(i => eigenvalues[i]);
    const sortedVecs = indices.map(i => {
        const vec = [];
        for (let j = 0; j < n; j++) vec.push(V[j][i]);
        return vec;
    });
    
    return { values: sortedVals, vectors: sortedVecs };
}

// Simple canvas line plotter
function drawPlot(canvas, config) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || canvas.offsetWidth || 500;
    const h = rect.height || canvas.offsetHeight || 300;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    
    const pad = { top: 30, right: 20, bottom: 40, left: 55 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;
    
    ctx.clearRect(0, 0, w, h);
    
    // Background
    ctx.fillStyle = '#0d1220';
    ctx.fillRect(0, 0, w, h);
    
    const { xMin, xMax, yMin, yMax, datasets, xLabel, yLabel, title } = config;
    
    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;
    
    function toX(v) { return pad.left + (v - xMin) / xRange * plotW; }
    function toY(v) { return pad.top + plotH - (v - yMin) / yRange * plotH; }
    
    // Grid
    ctx.strokeStyle = '#1e2a3a';
    ctx.lineWidth = 0.5;
    const nGridX = 5, nGridY = 5;
    for (let i = 0; i <= nGridX; i++) {
        const x = pad.left + (i / nGridX) * plotW;
        ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + plotH); ctx.stroke();
    }
    for (let i = 0; i <= nGridY; i++) {
        const y = pad.top + (i / nGridY) * plotH;
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + plotW, y); ctx.stroke();
    }
    
    // Axes
    ctx.strokeStyle = '#2a3a50';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + plotH);
    ctx.lineTo(pad.left + plotW, pad.top + plotH);
    ctx.stroke();
    
    // Axis labels
    ctx.fillStyle = '#64748b';
    ctx.font = '11px Inter';
    ctx.textAlign = 'center';
    for (let i = 0; i <= nGridX; i++) {
        const val = xMin + (i / nGridX) * xRange;
        ctx.fillText(val.toPrecision(3), pad.left + (i/nGridX) * plotW, pad.top + plotH + 18);
    }
    ctx.textAlign = 'right';
    for (let i = 0; i <= nGridY; i++) {
        const val = yMin + (1 - i / nGridY) * yRange;
        ctx.fillText(val.toPrecision(3), pad.left - 8, pad.top + (i/nGridY) * plotH + 4);
    }
    
    // Axis titles
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';
    if (xLabel) ctx.fillText(xLabel, pad.left + plotW/2, h - 5);
    if (yLabel) {
        ctx.save();
        ctx.translate(12, pad.top + plotH/2);
        ctx.rotate(-Math.PI/2);
        ctx.fillText(yLabel, 0, 0);
        ctx.restore();
    }
    if (title) {
        ctx.fillStyle = '#e8ecf4';
        ctx.font = 'bold 13px Inter';
        ctx.fillText(title, pad.left + plotW/2, 16);
    }
    
    // Datasets
    datasets.forEach(ds => {
        const { x, y, color, label, style, dotSize } = ds;
        ctx.strokeStyle = color || '#3b82f6';
        ctx.lineWidth = style === 'dashed' ? 1.5 : 2;
        if (style === 'dashed') ctx.setLineDash([6, 3]);
        else ctx.setLineDash([]);
        
        if (style !== 'dots') {
            ctx.beginPath();
            let started = false;
            for (let i = 0; i < x.length; i++) {
                const px = toX(x[i]), py = toY(y[i]);
                if (py < pad.top - 5 || py > pad.top + plotH + 5) {
                    started = false;
                    continue;
                }
                if (!started) { ctx.moveTo(px, py); started = true; }
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }
        
        if (style === 'dots' || dotSize) {
            ctx.fillStyle = color || '#3b82f6';
            const r = dotSize || 3;
            for (let i = 0; i < x.length; i++) {
                const px = toX(x[i]), py = toY(y[i]);
                if (py >= pad.top - 5 && py <= pad.top + plotH + 5) {
                    ctx.beginPath();
                    ctx.arc(px, py, r, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        
        ctx.setLineDash([]);
    });
    
    // Legend
    if (datasets.some(d => d.label)) {
        let lx = pad.left + 10, ly = pad.top + 10;
        ctx.font = '10px Inter';
        datasets.forEach(ds => {
            if (!ds.label) return;
            ctx.fillStyle = ds.color || '#3b82f6';
            ctx.fillRect(lx, ly - 4, 14, 3);
            ctx.fillStyle = '#94a3b8';
            ctx.textAlign = 'left';
            ctx.fillText(ds.label, lx + 18, ly);
            ly += 15;
        });
    }
}


// =========================================================
//  LAB 1: DECOHERENCE SIMULATOR
// =========================================================
const cohState = {
    running: false,
    time: 0,
    theta: Math.PI / 2, // initial θ
    phi: 0,             // initial φ
    // Bloch vector components at t=0
    rx0: 1, ry0: 0, rz0: 0,
    // Current
    rx: 1, ry: 0, rz: 0,
    // Density matrix (2x2 complex: [re00, re01, re10, re11, im00, im01, im10, im11])
    rho: [0.5, 0.5, 0.5, 0.5, 0, 0, 0, 0],
    history: { t: [], rx: [], ry: [], rz: [], purity: [] },
    animId: null,
    lastTimestamp: null
};

function setCoherenceState(preset) {
    const t1Slider = document.getElementById('coh-t1');
    const t2Slider = document.getElementById('coh-t2');
    switch (preset) {
        case 'transmon': t1Slider.value = 50; t2Slider.value = 30; break;
        case 'ion': t1Slider.value = 200; t2Slider.value = 200; break;
        case 'photon': t1Slider.value = 200; t2Slider.value = 100; break;
        case 'nv': t1Slider.value = 120; t2Slider.value = 40; break;
    }
    t1Slider.dispatchEvent(new Event('input'));
    t2Slider.dispatchEvent(new Event('input'));
}

function initBlochState(state) {
    switch (state) {
        case 'plus':
            cohState.theta = Math.PI/2; cohState.phi = 0;
            break;
        case 'zero':
            cohState.theta = 0; cohState.phi = 0;
            break;
        case 'one':
            cohState.theta = Math.PI; cohState.phi = 0;
            break;
        case 'custom':
            cohState.theta = parseFloat(document.getElementById('coh-theta').value) * Math.PI / 180;
            cohState.phi = parseFloat(document.getElementById('coh-phi').value) * Math.PI / 180;
            break;
    }
    
    cohState.rx0 = Math.sin(cohState.theta) * Math.cos(cohState.phi);
    cohState.ry0 = Math.sin(cohState.theta) * Math.sin(cohState.phi);
    cohState.rz0 = Math.cos(cohState.theta);
    cohState.rx = cohState.rx0;
    cohState.ry = cohState.ry0;
    cohState.rz = cohState.rz0;
    
    // Density matrix from Bloch vector: ρ = (I + r·σ)/2
    updateDensityFromBloch();
    
    cohState.time = 0;
    cohState.history = { t: [], rx: [], ry: [], rz: [], purity: [] };
}

function updateDensityFromBloch() {
    const {rx, ry, rz} = cohState;
    // ρ = [[½(1+rz), ½(rx - iry)], [½(rx + iry), ½(1-rz)]]
    cohState.rho = [
        0.5*(1+rz), 0.5*rx, 0.5*rx, 0.5*(1-rz),  // real parts: 00, 01, 10, 11
        0, -0.5*ry, 0.5*ry, 0                       // imag parts: 00, 01, 10, 11
    ];
}

function evolveDecoherence(dt) {
    const T1 = parseFloat(document.getElementById('coh-t1').value);
    const T2 = parseFloat(document.getElementById('coh-t2').value);
    const channel = document.getElementById('coh-channel').value;
    const t = cohState.time;
    
    // Analytical solutions for Lindblad evolution
    switch (channel) {
        case 'combined':
            cohState.rx = cohState.rx0 * Math.exp(-t / T2);
            cohState.ry = cohState.ry0 * Math.exp(-t / T2);
            cohState.rz = cohState.rz0 * Math.exp(-t / T1) + (1 - Math.exp(-t / T1)) * 1;
            // For amplitude damping, rz → +1 (ground state)
            // But we combine: rz decays to equilibrium
            cohState.rz = 1 - (1 - cohState.rz0) * Math.exp(-t / T1);
            break;
        case 'amplitude':
            cohState.rx = cohState.rx0 * Math.exp(-t / (2*T1));
            cohState.ry = cohState.ry0 * Math.exp(-t / (2*T1));
            cohState.rz = 1 - (1 - cohState.rz0) * Math.exp(-t / T1);
            break;
        case 'phase':
            cohState.rx = cohState.rx0 * Math.exp(-t / T2);
            cohState.ry = cohState.ry0 * Math.exp(-t / T2);
            cohState.rz = cohState.rz0; // no decay
            break;
        case 'depolarizing': {
            const gamma = 1 / T1;
            const decay = Math.exp(-gamma * t);
            cohState.rx = cohState.rx0 * decay;
            cohState.ry = cohState.ry0 * decay;
            cohState.rz = cohState.rz0 * decay;
            break;
        }
    }
    
    updateDensityFromBloch();
}

function drawBlochSphere(canvas) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || canvas.offsetWidth || 500;
    const h = rect.height || canvas.offsetHeight || 420;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    
    const cx = w / 2, cy = h / 2;
    const R = Math.min(w, h) * 0.36;
    
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0d1220';
    ctx.fillRect(0, 0, w, h);
    
    // Tilt for 3D perspective
    const tiltX = 0.35; // pitch
    const tiltY = -0.5; // yaw
    
    function project3D(x, y, z) {
        // Rotate around Y
        const x1 = x * Math.cos(tiltY) + z * Math.sin(tiltY);
        const z1 = -x * Math.sin(tiltY) + z * Math.cos(tiltY);
        // Rotate around X
        const y1 = y * Math.cos(tiltX) - z1 * Math.sin(tiltX);
        const z2 = y * Math.sin(tiltX) + z1 * Math.cos(tiltX);
        return { px: cx + x1 * R, py: cy - y1 * R, depth: z2 };
    }
    
    // Draw sphere outline
    ctx.strokeStyle = 'rgba(59,130,246,0.15)';
    ctx.lineWidth = 1;
    
    // Equator (XY circle)
    ctx.beginPath();
    for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        const p = project3D(Math.cos(a), 0, Math.sin(a));
        if (i === 0) ctx.moveTo(p.px, p.py);
        else ctx.lineTo(p.px, p.py);
    }
    ctx.stroke();
    
    // XZ circle (vertical)
    ctx.strokeStyle = 'rgba(139,92,246,0.12)';
    ctx.beginPath();
    for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        const p = project3D(Math.cos(a), Math.sin(a), 0);
        if (i === 0) ctx.moveTo(p.px, p.py);
        else ctx.lineTo(p.px, p.py);
    }
    ctx.stroke();
    
    // YZ circle
    ctx.strokeStyle = 'rgba(6,182,212,0.12)';
    ctx.beginPath();
    for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        const p = project3D(0, Math.cos(a), Math.sin(a));
        if (i === 0) ctx.moveTo(p.px, p.py);
        else ctx.lineTo(p.px, p.py);
    }
    ctx.stroke();
    
    // Axes
    const axes = [
        { dir: [1, 0, 0], label: 'X', color: '#ef4444' },
        { dir: [0, 1, 0], label: 'Z', color: '#10b981' },
        { dir: [0, 0, 1], label: 'Y', color: '#3b82f6' },
    ];
    
    axes.forEach(ax => {
        const pPos = project3D(ax.dir[0]*1.15, ax.dir[1]*1.15, ax.dir[2]*1.15);
        const pNeg = project3D(-ax.dir[0]*1.15, -ax.dir[1]*1.15, -ax.dir[2]*1.15);
        const p0 = project3D(0, 0, 0);
        
        ctx.strokeStyle = ax.color + '40';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pNeg.px, pNeg.py);
        ctx.lineTo(pPos.px, pPos.py);
        ctx.stroke();
        
        ctx.fillStyle = ax.color;
        ctx.font = 'bold 12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(ax.label, pPos.px, pPos.py - 5);
    });
    
    // Draw |0⟩ and |1⟩ labels
    const p0 = project3D(0, 1.25, 0);
    const p1 = project3D(0, -1.25, 0);
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 13px JetBrains Mono';
    ctx.fillText('|0⟩', p0.px + 12, p0.py);
    ctx.fillText('|1⟩', p1.px + 12, p1.py);
    
    // Trail
    if (cohState.history.rx.length > 1) {
        const len = cohState.history.rx.length;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = Math.max(0, len - 500); i < len; i++) {
            const p = project3D(cohState.history.rx[i], cohState.history.rz[i], cohState.history.ry[i]);
            const alpha = 0.1 + 0.5 * (i - Math.max(0, len-500)) / Math.min(len, 500);
            ctx.strokeStyle = `rgba(139,92,246,${alpha})`;
            if (i === Math.max(0, len-500)) ctx.moveTo(p.px, p.py);
            else ctx.lineTo(p.px, p.py);
        }
        ctx.stroke();
    }
    
    // State vector (arrow)
    const { rx, ry, rz } = cohState;
    const pState = project3D(rx, rz, ry);
    const pOrigin = project3D(0, 0, 0);
    
    // Arrow line
    const grad = ctx.createLinearGradient(pOrigin.px, pOrigin.py, pState.px, pState.py);
    grad.addColorStop(0, 'rgba(59,130,246,0.3)');
    grad.addColorStop(1, '#60a5fa');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(pOrigin.px, pOrigin.py);
    ctx.lineTo(pState.px, pState.py);
    ctx.stroke();
    
    // State point
    const purity = rx*rx + ry*ry + rz*rz;
    const pointSize = 5 + 3 * purity;
    ctx.beginPath();
    ctx.arc(pState.px, pState.py, pointSize, 0, Math.PI * 2);
    const ptGrad = ctx.createRadialGradient(pState.px, pState.py, 0, pState.px, pState.py, pointSize);
    ptGrad.addColorStop(0, '#ffffff');
    ptGrad.addColorStop(0.3, '#60a5fa');
    ptGrad.addColorStop(1, 'rgba(59,130,246,0)');
    ctx.fillStyle = ptGrad;
    ctx.fill();
    
    // Glow
    ctx.beginPath();
    ctx.arc(pState.px, pState.py, pointSize + 6, 0, Math.PI * 2);
    const glowGrad = ctx.createRadialGradient(pState.px, pState.py, pointSize - 2, pState.px, pState.py, pointSize + 10);
    glowGrad.addColorStop(0, 'rgba(96,165,250,0.4)');
    glowGrad.addColorStop(1, 'rgba(96,165,250,0)');
    ctx.fillStyle = glowGrad;
    ctx.fill();
}

function updateCoherenceDisplay() {
    const {rx, ry, rz, time} = cohState;
    document.getElementById('coh-rx').textContent = rx.toFixed(3);
    document.getElementById('coh-ry').textContent = ry.toFixed(3);
    document.getElementById('coh-rz').textContent = rz.toFixed(3);
    
    const purity = 0.5 * (1 + rx*rx + ry*ry + rz*rz);
    document.getElementById('coh-purity').textContent = purity.toFixed(3);
    document.getElementById('coh-time').textContent = time.toFixed(1) + ' μs';
    
    // Density matrix
    const rho00 = 0.5*(1+rz);
    const rho11 = 0.5*(1-rz);
    const rho01Re = 0.5*rx;
    const rho01Im = -0.5*ry;
    
    const td00 = document.getElementById('rho-00');
    const td01 = document.getElementById('rho-01');
    const td10 = document.getElementById('rho-10');
    const td11 = document.getElementById('rho-11');
    
    td00.textContent = rho00.toFixed(3);
    td11.textContent = rho11.toFixed(3);
    
    if (Math.abs(rho01Im) > 0.001) {
        td01.textContent = `${rho01Re.toFixed(3)}${rho01Im >= 0 ? '+' : ''}${rho01Im.toFixed(3)}i`;
        td10.textContent = `${rho01Re.toFixed(3)}${(-rho01Im) >= 0 ? '+' : ''}${(-rho01Im).toFixed(3)}i`;
    } else {
        td01.textContent = rho01Re.toFixed(3);
        td10.textContent = rho01Re.toFixed(3);
    }
    
    // Color coding
    [td00, td01, td10, td11].forEach(td => {
        const val = parseFloat(td.textContent);
        if (Math.abs(val) > 0.3) td.style.color = '#60a5fa';
        else if (Math.abs(val) > 0.1) td.style.color = '#94a3b8';
        else td.style.color = '#475569';
    });
    
    // Trace info
    document.getElementById('coh-trace').textContent = (rho00 + rho11).toFixed(3);
    document.getElementById('coh-purity2').textContent = purity.toFixed(3);
    
    // von Neumann entropy
    const p1 = 0.5*(1 + Math.sqrt(rx*rx + ry*ry + rz*rz));
    const p2 = 1 - p1;
    let entropy = 0;
    if (p1 > 1e-10 && p1 < 1-1e-10) {
        entropy = -p1*Math.log2(p1) - p2*Math.log2(p2);
    }
    document.getElementById('coh-entropy').textContent = entropy.toFixed(3);
}

function coherenceAnimLoop(timestamp) {
    if (!cohState.running) return;
    
    if (!cohState.lastTimestamp) cohState.lastTimestamp = timestamp;
    const elapsed = (timestamp - cohState.lastTimestamp) / 1000; // seconds
    cohState.lastTimestamp = timestamp;
    
    const speed = parseFloat(document.getElementById('coh-speed').value);
    cohState.time += elapsed * speed * 10; // 10 μs per real second at 1x
    
    evolveDecoherence(elapsed * speed * 10);
    
    // Record history
    if (cohState.history.t.length === 0 || cohState.time - cohState.history.t[cohState.history.t.length-1] > 0.1) {
        cohState.history.t.push(cohState.time);
        cohState.history.rx.push(cohState.rx);
        cohState.history.ry.push(cohState.ry);
        cohState.history.rz.push(cohState.rz);
        const pur = 0.5*(1 + cohState.rx**2 + cohState.ry**2 + cohState.rz**2);
        cohState.history.purity.push(pur);
    }
    
    drawBlochSphere(document.getElementById('bloch-canvas'));
    updateCoherenceDisplay();
    drawCoherenceDecay();
    
    cohState.animId = requestAnimationFrame(coherenceAnimLoop);
}

function drawCoherenceDecay() {
    const {t, rx, ry, rz, purity} = cohState.history;
    if (t.length < 2) return;
    
    const tMax = Math.max(t[t.length-1], 10);
    
    drawPlot(document.getElementById('coh-decay-canvas'), {
        xMin: 0, xMax: tMax,
        yMin: -1.1, yMax: 1.1,
        xLabel: 'Time (μs)', yLabel: 'Expectation Value',
        datasets: [
            { x: t, y: rx, color: '#ef4444', label: '⟨X⟩' },
            { x: t, y: ry, color: '#3b82f6', label: '⟨Y⟩' },
            { x: t, y: rz, color: '#10b981', label: '⟨Z⟩' },
            { x: t, y: purity, color: '#f59e0b', label: 'Purity', style: 'dashed' },
        ]
    });
}

// Event listeners - Coherence Lab
document.querySelectorAll('.state-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.state-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const state = btn.dataset.state;
        document.getElementById('coh-custom-angles').style.display = state === 'custom' ? 'block' : 'none';
        initBlochState(state);
        drawBlochSphere(document.getElementById('bloch-canvas'));
        updateCoherenceDisplay();
    });
});

document.getElementById('coh-theta').addEventListener('input', function() {
    document.getElementById('coh-theta-val').textContent = this.value + '°';
    if (document.querySelector('.state-btn.active').dataset.state === 'custom') {
        initBlochState('custom');
    }
});
document.getElementById('coh-phi').addEventListener('input', function() {
    document.getElementById('coh-phi-val').textContent = this.value + '°';
    if (document.querySelector('.state-btn.active').dataset.state === 'custom') {
        initBlochState('custom');
    }
});

document.getElementById('coh-t1').addEventListener('input', function() {
    document.getElementById('coh-t1-val').textContent = this.value + ' μs';
    // Enforce T2 <= 2*T1
    const t2Slider = document.getElementById('coh-t2');
    if (parseFloat(t2Slider.value) > 2 * parseFloat(this.value)) {
        t2Slider.value = 2 * parseFloat(this.value);
        t2Slider.dispatchEvent(new Event('input'));
    }
});
document.getElementById('coh-t2').addEventListener('input', function() {
    document.getElementById('coh-t2-val').textContent = this.value + ' μs';
});
document.getElementById('coh-speed').addEventListener('input', function() {
    document.getElementById('coh-speed-val').textContent = parseFloat(this.value).toFixed(1) + '×';
});

document.getElementById('coh-preset').addEventListener('change', function() {
    if (this.value !== 'custom') setCoherenceState(this.value);
});

document.getElementById('coh-start').addEventListener('click', () => {
    if (cohState.running) {
        cohState.running = false;
        document.getElementById('coh-start').textContent = '▶ Start';
    } else {
        cohState.running = true;
        cohState.lastTimestamp = null;
        document.getElementById('coh-start').textContent = '⏸ Pause';
        coherenceAnimLoop(performance.now());
    }
});

document.getElementById('coh-reset').addEventListener('click', () => {
    cohState.running = false;
    document.getElementById('coh-start').textContent = '▶ Start';
    if (cohState.animId) cancelAnimationFrame(cohState.animId);
    const activeState = document.querySelector('.state-btn.active').dataset.state;
    initBlochState(activeState);
    drawBlochSphere(document.getElementById('bloch-canvas'));
    updateCoherenceDisplay();
    drawCoherenceDecay();
});

// Initialize Coherence Lab  
initBlochState('plus');
// Defer initial draw to ensure canvas has layout dimensions
requestAnimationFrame(() => {
    drawBlochSphere(document.getElementById('bloch-canvas'));
    updateCoherenceDisplay();
});


// =========================================================
//  LAB 2: TRANSMON QUBIT DESIGNER
// =========================================================

function buildCPBHamiltonian(EjEc, Ec, ng, nmax) {
    const Ej = EjEc * Ec;
    const dim = 2 * nmax + 1;
    const H = [];
    for (let i = 0; i < dim; i++) {
        H[i] = new Array(dim).fill(0);
    }
    
    for (let i = 0; i < dim; i++) {
        const n = i - nmax;
        H[i][i] = 4 * Ec * (n - ng) * (n - ng);
        if (i + 1 < dim) {
            H[i][i+1] = -Ej / 2;
            H[i+1][i] = -Ej / 2;
        }
    }
    
    return { H, dim };
}

function computeTransmon() {
    const EjEc = parseFloat(document.getElementById('trans-ratio').value);
    const Ec = parseFloat(document.getElementById('trans-ec').value);
    const ng = parseFloat(document.getElementById('trans-ng').value);
    const nmax = parseInt(document.getElementById('trans-nmax').value);
    const nlevels = parseInt(document.getElementById('trans-nlevels').value);
    
    const { H, dim } = buildCPBHamiltonian(EjEc, Ec, ng, nmax);
    const eig = eigenSymmetric(H, dim);
    
    // Subtract ground state energy
    const E0 = eig.values[0];
    const energies = eig.values.slice(0, nlevels).map(e => e - E0);
    
    // Display results
    if (nlevels >= 2) {
        const w01 = energies[1] - energies[0];
        document.getElementById('trans-freq01').textContent = w01.toFixed(4) + ' GHz';
        
        if (nlevels >= 3) {
            const w12 = energies[2] - energies[1];
            document.getElementById('trans-freq12').textContent = w12.toFixed(4) + ' GHz';
            const alpha = w12 - w01;
            document.getElementById('trans-anharmonicity').textContent = (alpha * 1000).toFixed(1) + ' MHz';
            document.getElementById('trans-rel-anharm').textContent = (alpha / w01 * 100).toFixed(2) + '%';
        }
    }
    
    // Charge dispersion (compare ng=0 vs ng=0.5)
    const { H: H05 } = buildCPBHamiltonian(EjEc, Ec, 0.5, nmax);
    const eig05 = eigenSymmetric(H05, 2 * nmax + 1);
    const { H: H00 } = buildCPBHamiltonian(EjEc, Ec, 0, nmax);
    const eig00 = eigenSymmetric(H00, 2 * nmax + 1);
    const dispersion = Math.abs((eig05.values[1] - eig05.values[0]) - (eig00.values[1] - eig00.values[0]));
    document.getElementById('trans-charge-disp').textContent = (dispersion * 1000).toFixed(3) + ' MHz';
    
    // Draw spectrum
    drawTransmonSpectrum(energies, EjEc, Ec);
    
    return energies;
}

function drawTransmonSpectrum(energies, EjEc, Ec) {
    const canvas = document.getElementById('trans-spectrum-canvas');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || canvas.offsetWidth || 550;
    const h = rect.height || canvas.offsetHeight || 440;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    
    ctx.fillStyle = '#0d1220';
    ctx.fillRect(0, 0, w, h);
    
    const pad = { top: 40, right: 40, bottom: 40, left: 60 };
    const plotH = h - pad.top - pad.bottom;
    const plotW = w - pad.left - pad.right;
    
    const maxE = energies[energies.length - 1] * 1.1;
    
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6'];
    
    // Draw levels
    energies.forEach((E, i) => {
        const y = pad.top + plotH - (E / maxE) * plotH;
        const x1 = pad.left + plotW * 0.15;
        const x2 = pad.left + plotW * 0.85;
        
        ctx.strokeStyle = colors[i % colors.length];
        ctx.lineWidth = 3;
        ctx.shadowColor = colors[i % colors.length];
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Label
        ctx.fillStyle = colors[i % colors.length];
        ctx.font = 'bold 12px JetBrains Mono';
        ctx.textAlign = 'left';
        ctx.fillText(`|${i}⟩  ${E.toFixed(3)} GHz`, x2 + 10, y + 4);
        
        // Transition arrows
        if (i > 0) {
            const yPrev = pad.top + plotH - (energies[i-1] / maxE) * plotH;
            const arrowX = pad.left + plotW * 0.08;
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(arrowX, yPrev);
            ctx.lineTo(arrowX, y);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Transition frequency
            const dE = E - energies[i-1];
            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px JetBrains Mono';
            ctx.textAlign = 'right';
            ctx.fillText(`ω${i-1}${i}=${dE.toFixed(3)}`, arrowX - 5, (y + yPrev)/2 + 3);
        }
    });
    
    // Title
    ctx.fillStyle = '#e8ecf4';
    ctx.font = 'bold 14px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(`Transmon Spectrum — EJ/EC = ${EjEc.toFixed(1)}`, w/2, 20);
    
    // Harmonic oscillator comparison
    const w01 = energies.length >= 2 ? energies[1] : 1;
    ctx.setLineDash([3, 6]);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < energies.length; i++) {
        const Eho = w01 * i;
        if (Eho <= maxE) {
            const y = pad.top + plotH - (Eho / maxE) * plotH;
            ctx.beginPath();
            ctx.moveTo(pad.left + plotW * 0.15, y);
            ctx.lineTo(pad.left + plotW * 0.85, y);
            ctx.stroke();
        }
    }
    ctx.setLineDash([]);
    
    ctx.fillStyle = '#475569';
    ctx.font = '10px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('— dashed: harmonic oscillator levels for comparison —', w/2, h - 15);
}

function sweepEjEc() {
    const Ec = parseFloat(document.getElementById('trans-ec').value);
    const ng = parseFloat(document.getElementById('trans-ng').value);
    const nmax = parseInt(document.getElementById('trans-nmax').value);
    const nlevels = parseInt(document.getElementById('trans-nlevels').value);
    
    const ratios = [];
    const levelData = [];
    for (let i = 0; i < nlevels; i++) levelData.push({ x: [], y: [] });
    
    for (let r = 1; r <= 100; r += 0.5) {
        const { H, dim } = buildCPBHamiltonian(r, Ec, ng, nmax);
        const eig = eigenSymmetric(H, dim);
        const E0 = eig.values[0];
        
        ratios.push(r);
        for (let i = 0; i < nlevels; i++) {
            levelData[i].x.push(r);
            levelData[i].y.push(eig.values[i] - E0);
        }
    }
    
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6'];
    const datasets = levelData.map((d, i) => ({
        x: d.x, y: d.y,
        color: colors[i % colors.length],
        label: `E${i}`
    }));
    
    const yMax = Math.max(...levelData[nlevels-1].y) * 1.05;
    
    drawPlot(document.getElementById('trans-anharm-canvas'), {
        xMin: 1, xMax: 100,
        yMin: 0, yMax: yMax,
        xLabel: 'EJ/EC', yLabel: 'Energy (GHz)',
        title: 'Energy Levels vs EJ/EC',
        datasets
    });
}

function sweepNg() {
    const EjEc = parseFloat(document.getElementById('trans-ratio').value);
    const Ec = parseFloat(document.getElementById('trans-ec').value);
    const nmax = parseInt(document.getElementById('trans-nmax').value);
    const nlevels = parseInt(document.getElementById('trans-nlevels').value);
    
    const levelData = [];
    for (let i = 0; i < nlevels; i++) levelData.push({ x: [], y: [] });
    
    for (let ng = 0; ng <= 1; ng += 0.01) {
        const { H, dim } = buildCPBHamiltonian(EjEc, Ec, ng, nmax);
        const eig = eigenSymmetric(H, dim);
        const E0 = eig.values[0];
        
        for (let i = 0; i < nlevels; i++) {
            levelData[i].x.push(ng);
            levelData[i].y.push(eig.values[i] - E0);
        }
    }
    
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const datasets = levelData.map((d, i) => ({
        x: d.x, y: d.y,
        color: colors[i % colors.length],
        label: `E${i}`
    }));
    
    const yMax = Math.max(...levelData[nlevels-1].y) * 1.05;
    
    drawPlot(document.getElementById('trans-ng-canvas'), {
        xMin: 0, xMax: 1,
        yMin: 0, yMax: yMax,
        xLabel: 'Gate Charge ng', yLabel: 'Energy (GHz)',
        title: `Charge Dispersion — EJ/EC = ${EjEc.toFixed(1)}`,
        datasets
    });
}

// Transmon event listeners
['trans-ratio', 'trans-ec', 'trans-ng', 'trans-nmax', 'trans-nlevels'].forEach(id => {
    document.getElementById(id).addEventListener('input', function() {
        const valSpan = document.getElementById(id + '-val');
        if (valSpan) valSpan.textContent = this.value;
    });
});

document.getElementById('trans-compute').addEventListener('click', computeTransmon);
document.getElementById('trans-sweep').addEventListener('click', sweepEjEc);
document.getElementById('trans-sweep-ng').addEventListener('click', sweepNg);


// =========================================================
//  LAB 3: PHOTONIC CIRCUIT
// =========================================================

function computePhotonic() {
    const R = parseFloat(document.getElementById('phot-refl').value);
    const T = 1 - R;
    const phi = parseFloat(document.getElementById('phot-phase').value) * Math.PI / 180;
    const xi = parseFloat(document.getElementById('phot-dist').value);
    
    // For |1,1⟩ input into beam splitter
    // P(2,0) = R*T (1 + (1-xi)*cos(phi)) ... approximately
    // For ideal 50:50 BS with indistinguishable photons:
    // |1,1⟩ → (i/√2)(|2,0⟩ + |0,2⟩) → P11 = 0
    
    // General: P(1,1) = R² + T² - 2RT(1-ξ)cos(φ_relative)
    // Actually for two-photon interference:
    // P(1,1) = 1 - 2RT(1-ξ)  (at zero delay)
    // P(2,0) = RT(1 + (1-ξ)) / normalizing... 
    
    // More carefully:
    // P(2,0) = R*T 
    // P(0,2) = R*T
    // P(1,1) = R² + T² - 2*R*T*(1-ξ)
    // This gives P(2,0) + P(0,2) + P(1,1) = 1 when ξ=0
    
    const p11 = R*R + T*T - 2*R*T*(1-xi)*Math.cos(phi);
    const p20 = R*T*(1 + (1-xi)*Math.cos(phi));
    const p02 = R*T*(1 + (1-xi)*Math.cos(phi));
    
    // Normalize
    const total = p11 + p20 + p02;
    
    document.getElementById('phot-p20').textContent = (p20/total).toFixed(4);
    document.getElementById('phot-p02').textContent = (p02/total).toFixed(4);
    document.getElementById('phot-p11').textContent = (p11/total).toFixed(4);
    
    const visibility = (1 - xi) * 2*R*T / (R*R + T*T);
    document.getElementById('phot-vis').textContent = visibility.toFixed(4);
    
    // Draw BS diagram
    drawBeamSplitter(document.getElementById('phot-bs-canvas'), R, p11/total, p20/total, p02/total);
}

function drawBeamSplitter(canvas, R, p11, p20, p02) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || canvas.offsetWidth || 500;
    const h = rect.height || canvas.offsetHeight || 220;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    
    ctx.fillStyle = '#0d1220';
    ctx.fillRect(0, 0, w, h);
    
    const cx = w/2, cy = h/2;
    
    // Beam splitter box
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI/4);
    ctx.fillStyle = 'rgba(59,130,246,0.15)';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.fillRect(-25, -25, 50, 50);
    ctx.strokeRect(-25, -25, 50, 50);
    ctx.restore();
    
    ctx.fillStyle = '#60a5fa';
    ctx.font = 'bold 11px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.fillText('BS', cx, cy + 4);
    ctx.fillText(`R=${R.toFixed(2)}`, cx, cy + 55);
    
    // Input beams
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    
    // Top input
    ctx.beginPath(); ctx.moveTo(30, cy - 50); ctx.lineTo(cx - 30, cy); ctx.stroke();
    // Bottom input
    ctx.beginPath(); ctx.moveTo(30, cy + 50); ctx.lineTo(cx - 30, cy); ctx.stroke();
    
    // Output beams
    ctx.strokeStyle = '#10b981';
    // Top output
    ctx.beginPath(); ctx.moveTo(cx + 30, cy); ctx.lineTo(w - 30, cy - 50); ctx.stroke();
    // Bottom output
    ctx.beginPath(); ctx.moveTo(cx + 30, cy); ctx.lineTo(w - 30, cy + 50); ctx.stroke();
    
    // Labels
    ctx.fillStyle = '#f59e0b';
    ctx.font = '11px JetBrains Mono';
    ctx.textAlign = 'left';
    ctx.fillText('|1⟩', 5, cy - 53);
    ctx.fillText('|1⟩', 5, cy + 57);
    
    ctx.fillStyle = '#10b981';
    ctx.textAlign = 'right';
    ctx.fillText(`P=${p20.toFixed(3)}`, w - 5, cy - 53);
    ctx.fillText(`P=${p02.toFixed(3)}`, w - 5, cy + 57);
    
    // Coincidence
    ctx.fillStyle = p11 < 0.01 ? '#10b981' : '#ef4444';
    ctx.font = 'bold 12px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(`Coincidence P(1,1) = ${p11.toFixed(4)}`, cx, h - 10);
}

function sweepHOM() {
    const R = parseFloat(document.getElementById('phot-refl').value);
    const T = 1 - R;
    const xi = parseFloat(document.getElementById('phot-dist').value);
    
    const tauC = 100; // coherence time in fs
    const delays = [], coincidences = [];
    
    for (let tau = -500; tau <= 500; tau += 5) {
        delays.push(tau);
        // Gaussian overlap: (1-xi) * exp(-(tau/tauC)^2)
        const overlap = (1 - xi) * Math.exp(-(tau/tauC)**2);
        const p11 = R*R + T*T - 2*R*T*overlap;
        const p20 = R*T*(1 + overlap);
        const p02 = R*T*(1 + overlap);
        const total = p11 + p20 + p02;
        coincidences.push(p11 / total);
    }
    
    const classical = R*R + T*T;
    const classicalLine = delays.map(() => classical / (classical + 2*R*T));
    
    drawPlot(document.getElementById('phot-hom-canvas'), {
        xMin: -500, xMax: 500,
        yMin: 0, yMax: 0.7,
        xLabel: 'Time Delay τ (fs)', yLabel: 'Coincidence Rate P(1,1)',
        title: 'Hong-Ou-Mandel Dip',
        datasets: [
            { x: delays, y: coincidences, color: '#3b82f6', label: 'Quantum' },
            { x: delays, y: classicalLine, color: '#ef4444', label: 'Classical limit', style: 'dashed' }
        ]
    });
}

function computeMZI() {
    const phi = parseFloat(document.getElementById('phot-mz-phase').value) * Math.PI / 180;
    const input = document.getElementById('phot-mz-input').value;
    
    let p1, p2;
    if (input === 'single') {
        // Single photon through MZI: |1,0⟩ → BS → phase → BS
        // P1 = cos²(φ/2), P2 = sin²(φ/2)
        p1 = Math.cos(phi/2)**2;
        p2 = Math.sin(phi/2)**2;
    } else {
        // Coherent state: same formula but classical intensity
        p1 = Math.cos(phi/2)**2;
        p2 = Math.sin(phi/2)**2;
    }
    
    document.getElementById('phot-mz-p1').textContent = p1.toFixed(4);
    document.getElementById('phot-mz-p2').textContent = p2.toFixed(4);
}

// Photonic event listeners
['phot-refl', 'phot-phase', 'phot-dist', 'phot-delay'].forEach(id => {
    document.getElementById(id).addEventListener('input', function() {
        const valSpan = document.getElementById(id + '-val');
        if (valSpan) {
            if (id === 'phot-delay') valSpan.textContent = this.value + ' fs';
            else if (id === 'phot-phase') valSpan.textContent = this.value + '°';
            else valSpan.textContent = parseFloat(this.value).toFixed(2);
        }
    });
});

document.getElementById('phot-mz-phase').addEventListener('input', function() {
    document.getElementById('phot-mz-phase-val').textContent = this.value + '°';
});

document.getElementById('phot-compute').addEventListener('click', computePhotonic);
document.getElementById('phot-sweep-hom').addEventListener('click', sweepHOM);
document.getElementById('phot-mz-compute').addEventListener('click', computeMZI);


// =========================================================
//  LAB 4: ION TRAP SIMULATOR
// =========================================================

function computeIonTrap() {
    const a = parseFloat(document.getElementById('ion-a').value);
    const q = parseFloat(document.getElementById('ion-q').value);
    const omega = parseFloat(document.getElementById('ion-omega').value); // MHz
    
    // Stability check: approximate first stability region
    // Stable if β² > 0, where β² ≈ a + q²/2 (lowest order)
    const beta2 = a + q*q/2;
    const stable = beta2 > 0 && q < 0.908;
    
    document.getElementById('ion-stable').textContent = stable ? '✅ STABLE' : '❌ UNSTABLE';
    document.getElementById('ion-stable').style.color = stable ? '#10b981' : '#ef4444';
    
    if (stable) {
        const beta = Math.sqrt(beta2);
        const secFreq = beta * omega / 2;
        document.getElementById('ion-secular').textContent = secFreq.toFixed(3) + ' MHz';
        
        // Trap depth (approximate, for Ca-40 ion)
        const m = 40 * 1.66e-27; // kg
        const eCharge = 1.6e-19;
        const omegaSec = secFreq * 1e6 * 2 * Math.PI;
        const r0 = 0.5e-3; // 0.5 mm trap radius
        const depth = 0.5 * m * omegaSec * omegaSec * r0 * r0 / eCharge;
        document.getElementById('ion-depth').textContent = depth.toFixed(4) + ' eV';
    } else {
        document.getElementById('ion-secular').textContent = 'N/A';
        document.getElementById('ion-depth').textContent = 'N/A';
    }
    
    drawStabilityDiagram(a, q);
}

function drawStabilityDiagram(currentA, currentQ) {
    const canvas = document.getElementById('ion-stability-canvas');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || canvas.offsetWidth || 500;
    const h = rect.height || canvas.offsetHeight || 350;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    
    ctx.fillStyle = '#0d1220';
    ctx.fillRect(0, 0, w, h);
    
    const pad = { top: 35, right: 20, bottom: 40, left: 50 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;
    
    const qMax = 1.0, aMin = -0.5, aMax = 0.5;
    
    function toX(qv) { return pad.left + (qv / qMax) * plotW; }
    function toY(av) { return pad.top + plotH - ((av - aMin) / (aMax - aMin)) * plotH; }
    
    // Color the stability region (pixel by pixel, but sampling)
    const imgData = ctx.createImageData(canvas.width, canvas.height);
    for (let px = 0; px < plotW * dpr; px++) {
        for (let py = 0; py < plotH * dpr; py++) {
            const qv = (px / (plotW * dpr)) * qMax;
            const av = aMax - (py / (plotH * dpr)) * (aMax - aMin);
            
            const beta2 = av + qv*qv/2;
            const isStable = beta2 > 0 && qv < 0.908;
            
            const ix = Math.floor(pad.left * dpr + px);
            const iy = Math.floor(pad.top * dpr + py);
            const idx = (iy * canvas.width + ix) * 4;
            
            if (isStable) {
                // Gradient based on beta
                const beta = Math.sqrt(beta2);
                imgData.data[idx] = 20 + beta * 40;
                imgData.data[idx+1] = 40 + beta * 100;
                imgData.data[idx+2] = 80 + beta * 150;
                imgData.data[idx+3] = 100;
            } else {
                imgData.data[idx] = 13;
                imgData.data[idx+1] = 18;
                imgData.data[idx+2] = 32;
                imgData.data[idx+3] = 255;
            }
        }
    }
    ctx.putImageData(imgData, 0, 0);
    
    // Grid and axes
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 0.5;
    for (let qv = 0; qv <= qMax; qv += 0.2) {
        ctx.beginPath(); ctx.moveTo(toX(qv), pad.top); ctx.lineTo(toX(qv), pad.top + plotH); ctx.stroke();
    }
    for (let av = aMin; av <= aMax; av += 0.2) {
        ctx.beginPath(); ctx.moveTo(pad.left, toY(av)); ctx.lineTo(pad.left + plotW, toY(av)); ctx.stroke();
    }
    
    // Axes
    ctx.strokeStyle = '#2a3a50';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + plotH);
    ctx.lineTo(pad.left + plotW, pad.top + plotH);
    ctx.stroke();
    
    // a=0 line
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.moveTo(pad.left, toY(0));
    ctx.lineTo(pad.left + plotW, toY(0));
    ctx.stroke();
    
    // Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px Inter';
    ctx.textAlign = 'center';
    for (let qv = 0; qv <= qMax; qv += 0.2) {
        ctx.fillText(qv.toFixed(1), toX(qv), pad.top + plotH + 18);
    }
    ctx.textAlign = 'right';
    for (let av = aMin; av <= aMax; av += 0.2) {
        ctx.fillText(av.toFixed(1), pad.left - 8, toY(av) + 4);
    }
    
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Mathieu parameter q', pad.left + plotW/2, h - 5);
    ctx.save();
    ctx.translate(12, pad.top + plotH/2);
    ctx.rotate(-Math.PI/2);
    ctx.fillText('Mathieu parameter a', 0, 0);
    ctx.restore();
    
    ctx.fillStyle = '#e8ecf4';
    ctx.font = 'bold 13px Inter';
    ctx.fillText('Paul Trap Stability Diagram', pad.left + plotW/2, 18);
    
    // Current point
    const px = toX(currentQ);
    const py = toY(currentA);
    
    ctx.beginPath();
    ctx.arc(px, py, 8, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(px, py, 0, px, py, 8);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, '#f59e0b');
    grad.addColorStop(1, 'rgba(245,158,11,0)');
    ctx.fillStyle = grad;
    ctx.fill();
    
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.stroke();
    
    // Label for stable region
    ctx.fillStyle = 'rgba(59,130,246,0.6)';
    ctx.font = 'bold 16px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('STABLE', toX(0.3), toY(0.05));
}

function computeRabi() {
    const OmR = parseFloat(document.getElementById('ion-rabi').value); // kHz
    const delta = parseFloat(document.getElementById('ion-det').value); // kHz
    const gamma = parseFloat(document.getElementById('ion-damp').value); // kHz
    
    const Omega_eff = Math.sqrt(OmR*OmR + delta*delta);
    
    const times = [], pUp = [], pDown = [];
    const tMax = 5 / OmR * 1000; // enough for ~5 Rabi cycles, in μs
    
    for (let t = 0; t <= tMax; t += tMax/500) {
        times.push(t);
        const tMs = t / 1000; // convert μs to ms for kHz rates
        const damping = Math.exp(-gamma * tMs);
        const pe = (OmR*OmR / (Omega_eff*Omega_eff)) * Math.sin(Math.PI * Omega_eff * tMs)**2 * damping;
        pUp.push(pe);
        pDown.push(1 - pe);
    }
    
    drawPlot(document.getElementById('ion-rabi-canvas'), {
        xMin: 0, xMax: tMax,
        yMin: 0, yMax: 1.05,
        xLabel: 'Time (μs)', yLabel: 'Probability',
        title: `Rabi Oscillations — Ω_R=${OmR}kHz, δ=${delta}kHz`,
        datasets: [
            { x: times, y: pUp, color: '#3b82f6', label: 'P(↑)' },
            { x: times, y: pDown, color: '#ef4444', label: 'P(↓)', style: 'dashed' },
        ]
    });
}

// Ion trap event listeners
['ion-a', 'ion-q', 'ion-omega'].forEach(id => {
    document.getElementById(id).addEventListener('input', function() {
        document.getElementById(id + '-val').textContent = this.value;
    });
});

['ion-rabi', 'ion-det', 'ion-damp'].forEach(id => {
    document.getElementById(id).addEventListener('input', function() {
        document.getElementById(id + '-val').textContent = this.value;
    });
});

document.getElementById('ion-compute').addEventListener('click', computeIonTrap);
document.getElementById('ion-trajectory').addEventListener('click', computeIonTrap);
document.getElementById('ion-rabi-compute').addEventListener('click', computeRabi);


// =========================================================
//  LAB 5: NV CENTER
// =========================================================

function computeNVCenter() {
    const B = parseFloat(document.getElementById('nv-b').value); // mT
    const thetaB = parseFloat(document.getElementById('nv-theta').value) * Math.PI / 180;
    const D = parseFloat(document.getElementById('nv-d').value); // GHz
    const E = parseFloat(document.getElementById('nv-e').value) / 1000; // convert MHz to GHz
    const temp = parseFloat(document.getElementById('nv-temp').value);
    
    // Spin-1 Hamiltonian in {|+1⟩, |0⟩, |-1⟩} basis
    // H = D*Sz² + E*(Sx² - Sy²) + ge*μB*B·S
    // ge*μB/h ≈ 28.025 GHz/T
    const gamma = 28.025; // GHz/T
    const B_T = B / 1000; // convert mT to T
    const Bz = B_T * Math.cos(thetaB);
    const Bx = B_T * Math.sin(thetaB);
    
    // Sz² = diag(1, 0, 1) in {|+1⟩, |0⟩, |-1⟩}
    // Sz = diag(1, 0, -1)
    // Sx = (1/√2) * [[0,1,0],[1,0,1],[0,1,0]]
    // Sx² - Sy² = [[0,0,1],[0,0,0],[1,0,0]]
    
    // H matrix (real symmetric):
    // H[0][0] = D + gamma*Bz        (|+1⟩)
    // H[1][1] = 0                    (|0⟩)
    // H[2][2] = D - gamma*Bz        (|-1⟩)
    // H[0][1] = H[1][0] = gamma*Bx/√2
    // H[1][2] = H[2][1] = gamma*Bx/√2
    // H[0][2] = H[2][0] = E
    
    const sq2 = Math.sqrt(2);
    const H = [
        [D + gamma*Bz, gamma*Bx/sq2, E],
        [gamma*Bx/sq2, 0, gamma*Bx/sq2],
        [E, gamma*Bx/sq2, D - gamma*Bz]
    ];
    
    const eig = eigenSymmetric(H, 3);
    const E0 = eig.values[0]; // Ground (should be ~0 for |0⟩ at low field)
    
    // Sort: find which eigenvalue corresponds to ms=0
    // At B=0: E(ms=0)=0, E(ms=±1) = D ± E
    const energies = eig.values;
    
    document.getElementById('nv-e0').textContent = energies[0].toFixed(4) + ' GHz';
    document.getElementById('nv-ep1').textContent = energies[2].toFixed(4) + ' GHz';
    document.getElementById('nv-em1').textContent = energies[1].toFixed(4) + ' GHz';
    
    // Transition frequencies (from ms=0 to ms=±1)
    const fPlus = energies[2] - energies[0];
    const fMinus = energies[1] - energies[0];
    
    document.getElementById('nv-fp').textContent = fPlus.toFixed(4) + ' GHz';
    document.getElementById('nv-fm').textContent = fMinus.toFixed(4) + ' GHz';
    document.getElementById('nv-split').textContent = Math.abs(fPlus - fMinus).toFixed(4) + ' GHz';
    
    drawODMR(fPlus, fMinus, D, E);
}

function drawODMR(fPlus, fMinus, D, E) {
    const canvas = document.getElementById('nv-odmr-canvas');
    
    // ODMR spectrum: photoluminescence dips at transition frequencies
    const fCenter = (fPlus + fMinus) / 2;
    const fRange = Math.max(Math.abs(fPlus - fMinus) * 2, 0.3);
    const fMin = fCenter - fRange;
    const fMax = fCenter + fRange;
    
    const freqs = [], pl = [];
    const linewidth = 0.005; // GHz
    
    for (let f = fMin; f <= fMax; f += (fMax - fMin) / 500) {
        freqs.push(f);
        // Lorentzian dips
        const dip1 = 0.3 / (1 + ((f - fPlus) / linewidth)**2);
        const dip2 = 0.3 / (1 + ((f - fMinus) / linewidth)**2);
        pl.push(1 - dip1 - dip2);
    }
    
    drawPlot(canvas, {
        xMin: fMin, xMax: fMax,
        yMin: 0.5, yMax: 1.05,
        xLabel: 'MW Frequency (GHz)', yLabel: 'PL Intensity (norm.)',
        title: 'ODMR Spectrum',
        datasets: [
            { x: freqs, y: pl, color: '#10b981', label: 'PL signal' },
        ]
    });
}

function sweepBfield() {
    const thetaB = parseFloat(document.getElementById('nv-theta').value) * Math.PI / 180;
    const D = parseFloat(document.getElementById('nv-d').value);
    const Estrain = parseFloat(document.getElementById('nv-e').value) / 1000;
    
    const gamma = 28.025;
    const sq2 = Math.sqrt(2);
    
    const bFields = [], e0 = [], e1 = [], e2 = [];
    
    for (let B = 0; B <= 200; B += 1) {
        const B_T = B / 1000;
        const Bz = B_T * Math.cos(thetaB);
        const Bx = B_T * Math.sin(thetaB);
        
        const H = [
            [D + gamma*Bz, gamma*Bx/sq2, Estrain],
            [gamma*Bx/sq2, 0, gamma*Bx/sq2],
            [Estrain, gamma*Bx/sq2, D - gamma*Bz]
        ];
        
        const eig = eigenSymmetric(H, 3);
        
        bFields.push(B);
        e0.push(eig.values[0]);
        e1.push(eig.values[1]);
        e2.push(eig.values[2]);
    }
    
    drawPlot(document.getElementById('nv-energy-canvas'), {
        xMin: 0, xMax: 200,
        yMin: Math.min(...e0) - 0.2, yMax: Math.max(...e2) + 0.2,
        xLabel: 'Magnetic Field B (mT)', yLabel: 'Energy (GHz)',
        title: `NV Center Zeeman Splitting — θ=${(thetaB*180/Math.PI).toFixed(0)}°`,
        datasets: [
            { x: bFields, y: e0, color: '#3b82f6', label: 'E₀ (ms≈0)' },
            { x: bFields, y: e1, color: '#10b981', label: 'E₁ (ms≈-1)' },
            { x: bFields, y: e2, color: '#ef4444', label: 'E₂ (ms≈+1)' },
        ]
    });
}

// NV Center event listeners
['nv-b', 'nv-theta', 'nv-d', 'nv-e', 'nv-temp'].forEach(id => {
    document.getElementById(id).addEventListener('input', function() {
        const valSpan = document.getElementById(id + '-val');
        if (!valSpan) return;
        if (id === 'nv-d') valSpan.textContent = parseFloat(this.value).toFixed(3);
        else valSpan.textContent = this.value;
    });
});

document.getElementById('nv-compute').addEventListener('click', computeNVCenter);
document.getElementById('nv-sweep-b').addEventListener('click', () => {
    sweepBfield();
    computeNVCenter();
});

// =========================================================
//  INITIAL LOAD
// =========================================================
window.addEventListener('load', () => {
    // Auto-compute first lab
    drawBlochSphere(document.getElementById('bloch-canvas'));
    updateCoherenceDisplay();
});
