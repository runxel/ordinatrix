
class Ordinatrix {
	constructor() {
		this.inputEl = document.getElementById('inputData');
		this.outputEl = document.getElementById('outputData');
		this.processBtn = document.getElementById('processBtn');
		this.hasZEl = document.getElementById('hasZ');
		this.hasStatusEl = document.getElementById('hasStatus');
		this.typeEl = document.getElementById('transformType');
		this.copyBtn = document.getElementById('copyBtn');
		this.useInputBtn = document.getElementById('useInputBtn');
		this.resetBtns = document.querySelectorAll('.reset-btn');

		// Cache input elements
		this.transforms = {
			t: { x: 'transX', y: 'transY', z: 'transZ' },
			s: { x: 'scaleX', y: 'scaleY', z: 'scaleZ' },
			r: { x: 'rotX', y: 'rotY', z: 'rotZ' }
		};

		this.defaults = {
			translate: { transX: 0, transY: 0, transZ: 0 },
			scale: { scaleX: 1, scaleY: 1, scaleZ: 1 },
			rotate: { rotX: 0, rotY: 0, rotZ: 0 }
		};

		this.attachListeners();
		this.updateUI();
	}

	attachListeners() {
		this.processBtn.addEventListener('click', () => this.process());
		this.hasZEl.addEventListener('change', () => this.updateUI());
		this.typeEl.addEventListener('change', () => this.updateUI());
		this.copyBtn.addEventListener('click', () => this.copyToClipboard());
		this.useInputBtn.addEventListener('click', () => this.useOutputAsInput());
		this.resetBtns.forEach(btn =>
			btn.addEventListener('click', () => this.resetGroup(btn.dataset.target))
		);
	}

	async copyToClipboard() {
		try {
			await navigator.clipboard.writeText(this.outputEl.value);
			// Visual feedback
			const originalText = this.copyBtn.textContent;
			this.copyBtn.textContent = 'Copied!';
			setTimeout(() => {
				this.copyBtn.textContent = originalText;
			}, 1500);
		} catch (err) {
			console.error('Failed to copy:', err);
			this.copyBtn.textContent = 'Copy failed';
			setTimeout(() => {
				this.copyBtn.textContent = 'Copy to Clipboard';
			}, 1500);
		}
	}

	resetGroup(type) {
		const defaults = this.defaults[type];
		if (!defaults) return;
		Object.entries(defaults).forEach(([id, val]) => {
			const el = document.getElementById(id);
			if (el) el.value = val;
		});
		this.updateUI();
	}

	useOutputAsInput() {
		if (this.outputEl.value.trim() !== "") {
			this.inputEl.value = this.outputEl.value;
			// Optional: Clear output to indicate "moved" or leave it? 
			// Usually easier to leave it or clear it. Let's scroll input to view.
			this.inputEl.scrollIntoView({ behavior: 'smooth' });
		}
	}

	updateUI() {
		const hasZ = this.hasZEl.checked;
		const type = this.typeEl.value;

		// Toggle visibility of transformation groups
		document.getElementById('group-translate').style.display = type === 'translate' ? 'block' : 'none';
		document.getElementById('group-scale').style.display = type === 'scale' ? 'block' : 'none';
		document.getElementById('group-rotate').style.display = type === 'rotate' ? 'block' : 'none';

		// Normal Z inputs (Translation/Scaling) - Scale and Translate Z hidden if no Z
		// Only change if the type matches, otherwise logic still holds but element is hidden anyway
		if (type === 'translate' || type === 'scale') {
			const typeKey = type === 'translate' ? 'transZ' : 'scaleZ';
			const el = document.getElementById(typeKey);
			if (el && el.parentElement) {
				el.parentElement.style.display = hasZ ? 'flex' : 'none';
			}
		}

		// Rotation logic
		if (type === 'rotate') {
			const rX = document.getElementById('rotX').parentElement;
			const rY = document.getElementById('rotY').parentElement;
			const rZ = document.getElementById('rotZ').parentElement;

			if (hasZ) {
				// 3D: Show all rotations
				rX.style.display = 'flex';
				rY.style.display = 'flex';
				rZ.style.display = 'flex';

				// Revert label to Z
				if (rZ.firstChild) rZ.firstChild.textContent = "Z-axis: ";
			} else {
				// 2D: Show ONLY rotZ (which acts as the 2D plane rotation), hide X and Y
				rX.style.display = 'none';
				rY.style.display = 'none';
				rZ.style.display = 'flex';

				// Change label to clear "Rotation" or "Angle"
				if (rZ.firstChild) rZ.firstChild.textContent = "Angle: ";
			}
		}
	}

	getValues(type) {
		const ids = this.transforms[type];
		return {
			x: parseFloat(document.getElementById(ids.x).value) || 0,
			y: parseFloat(document.getElementById(ids.y).value) || 0,
			z: parseFloat(document.getElementById(ids.z).value) || 0
		};
	}

	parseInput(text) {
		// Remove all whitespace except commas and newlines mostly to clean up, 
		// but user might use space as separator.

		// Calculate chunk size based on options
		// Base is x, y (2)
		// If Z is enabled: +1
		// If Status is enabled: +1
		const hasZ = this.hasZEl.checked;
		const hasStatus = this.hasStatusEl.checked;

		let chunkSize = 2;
		if (hasZ) chunkSize++;
		if (hasStatus) chunkSize++;

		const content = text.trim();
		if (!content) return [];

		// Split by comma or newline or spaces
		const items = content.split(/[\s,]+/).filter(s => s !== '');
		const points = [];

		for (let k = 0; k < items.length; k += chunkSize) {
			// Need at least enough items to fill the expected chunk
			if (k + (chunkSize - 1) < items.length) {
				let offset = 0;

				// Always get X and Y
				const x = parseFloat(items[k + offset++]);
				const y = parseFloat(items[k + offset++]);

				// Optional Z
				let z = 0;
				if (hasZ) {
					z = parseFloat(items[k + offset++]);
				}

				// Optional Status
				let i = null;
				if (hasStatus) {
					i = items[k + offset++];
				}

				points.push({ x, y, z, i });
			}
		}
		return points;
	}

	// Deg to Rad
	rad(deg) {
		return deg * (Math.PI / 180);
	}

	rotate(x, y, z, rx, ry, rz) {
		const radX = this.rad(rx);
		const radY = this.rad(ry);
		const radZ = this.rad(rz);

		// Rotate Order: X -> Y -> Z

		// Rotate around X
		let y_1 = y * Math.cos(radX) - z * Math.sin(radX);
		let z_1 = y * Math.sin(radX) + z * Math.cos(radX);
		let x_1 = x;

		// Rotate around Y
		let x_2 = x_1 * Math.cos(radY) + z_1 * Math.sin(radY);
		let z_2 = -x_1 * Math.sin(radY) + z_1 * Math.cos(radY);
		let y_2 = y_1;

		// Rotate around Z
		let x_3 = x_2 * Math.cos(radZ) - y_2 * Math.sin(radZ);
		let y_3 = x_2 * Math.sin(radZ) + y_2 * Math.cos(radZ);
		let z_3 = z_2;

		return { x: x_3, y: y_3, z: z_3 };
	}

	process() {
		const rawText = this.inputEl.value;
		const points = this.parseInput(rawText);
		const type = this.typeEl.value;

		const transformed = points.map(p => {
			let x = p.x;
			let y = p.y;
			let z = p.z;

			if (type === 'scale') {
				const s = this.getValues('s');
				// Defaults for scale if 0 (though user inputs default to 1)
				if (s.x === 0 && document.getElementById('scaleX').value === '') s.x = 1;
				if (s.y === 0 && document.getElementById('scaleY').value === '') s.y = 1;
				if (s.z === 0 && document.getElementById('scaleZ').value === '') s.z = 1;

				x = p.x * s.x;
				y = p.y * s.y;
				z = p.z * s.z;
			} else if (type === 'rotate') {
				const r = this.getValues('r');
				const rotated = this.rotate(x, y, z, r.x, r.y, r.z);
				x = rotated.x;
				y = rotated.y;
				z = rotated.z;
			} else if (type === 'translate') {
				const t = this.getValues('t');
				x += t.x;
				y += t.y;
				z += t.z;
			}

			return {
				x: this.formatNum(x),
				y: this.formatNum(y),
				z: this.formatNum(z),
				i: p.i
			};
		});

		this.renderOutput(transformed);
	}

	formatNum(num) {
		// Avoid crazy floating point precision issues (e.g. 0.000000000004)
		// Check if integer within epsilon
		if (Math.abs(Math.round(num) - num) < 0.000001) {
			return Math.round(num);
		}
		// Max 4 decimals for clean output
		return parseFloat(num.toFixed(4));
	}

	renderOutput(points) {
		const hasZ = this.hasZEl.checked;
		const hasStatus = this.hasStatusEl.checked;

		// normalize into lines
		const lines = points.map(p => {
			const parts = [p.x, p.y];
			if (hasZ) parts.push(p.z);
			if (hasStatus) parts.push(p.i);
			return parts.join(', ');
		});
		this.outputEl.value = lines.join(',\n');
	}
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
	new Ordinatrix();
});
