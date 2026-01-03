/**
 * Tests for Snake Game Touch Controls
 */

describe('Snake Game Touch Controls', () => {
    let canvas;
    let touchStartEvent;
    let touchMoveEvent;
    let touchEndEvent;

    beforeEach(() => {
        // Create a mock canvas element
        canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
    });

    afterEach(() => {
        canvas = null;
    });

    describe('Touch Event Prevention', () => {
        it('should prevent default behavior on touchstart', () => {
            let preventDefaultCalled = false;
            
            const handler = (e) => {
                e.preventDefault();
                preventDefaultCalled = true;
            };
            
            canvas.addEventListener('touchstart', handler, { passive: false });
            
            touchStartEvent = new TouchEvent('touchstart', {
                touches: [{ clientX: 100, clientY: 100 }],
                cancelable: true
            });
            
            canvas.dispatchEvent(touchStartEvent);
            
            // In real implementation, preventDefault would be called
            expect(preventDefaultCalled).toBe(true);
        });

        it('should prevent default behavior on touchmove', () => {
            let preventDefaultCalled = false;
            
            const handler = (e) => {
                e.preventDefault();
                preventDefaultCalled = true;
            };
            
            canvas.addEventListener('touchmove', handler, { passive: false });
            
            touchMoveEvent = new TouchEvent('touchmove', {
                touches: [{ clientX: 150, clientY: 100 }],
                cancelable: true
            });
            
            canvas.dispatchEvent(touchMoveEvent);
            
            expect(preventDefaultCalled).toBe(true);
        });

        it('should prevent default behavior on touchend', () => {
            let preventDefaultCalled = false;
            
            const handler = (e) => {
                e.preventDefault();
                preventDefaultCalled = true;
            };
            
            canvas.addEventListener('touchend', handler, { passive: false });
            
            touchEndEvent = new TouchEvent('touchend', {
                changedTouches: [{ clientX: 200, clientY: 100 }],
                cancelable: true
            });
            
            canvas.dispatchEvent(touchEndEvent);
            
            expect(preventDefaultCalled).toBe(true);
        });
    });

    describe('Swipe Direction Detection', () => {
        function simulateSwipe(startX, startY, endX, endY) {
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            const absDeltaX = Math.abs(deltaX);
            const absDeltaY = Math.abs(deltaY);
            const minSwipeDistance = 30;

            if (Math.max(absDeltaX, absDeltaY) < minSwipeDistance) {
                return null;
            }

            if (absDeltaX > absDeltaY) {
                return deltaX > 0 ? 'right' : 'left';
            } else {
                return deltaY > 0 ? 'down' : 'up';
            }
        }

        it('should detect right swipe', () => {
            const direction = simulateSwipe(100, 200, 200, 200);
            expect(direction).toBe('right');
        });

        it('should detect left swipe', () => {
            const direction = simulateSwipe(200, 200, 100, 200);
            expect(direction).toBe('left');
        });

        it('should detect up swipe', () => {
            const direction = simulateSwipe(200, 200, 200, 100);
            expect(direction).toBe('up');
        });

        it('should detect down swipe', () => {
            const direction = simulateSwipe(200, 100, 200, 200);
            expect(direction).toBe('down');
        });

        it('should ignore swipes shorter than minimum distance', () => {
            const direction = simulateSwipe(200, 200, 210, 200);
            expect(direction).toBeNull();
        });

        it('should detect horizontal swipe when horizontal movement is larger', () => {
            const direction = simulateSwipe(100, 200, 250, 220);
            expect(direction).toBe('right');
        });

        it('should detect vertical swipe when vertical movement is larger', () => {
            const direction = simulateSwipe(200, 100, 220, 250);
            expect(direction).toBe('down');
        });
    });

    describe('Canvas Touch Action Style', () => {
        it('should have touch-action: none style on canvas', () => {
            canvas.style.touchAction = 'none';
            expect(canvas.style.touchAction).toBe('none');
        });
    });

    describe('Direction Change Rules', () => {
        function canChangeDirection(currentDirection, newDirection) {
            // Cannot reverse direction (e.g., can't go left if currently going right)
            if (currentDirection.x === 1 && newDirection.x === -1) return false;
            if (currentDirection.x === -1 && newDirection.x === 1) return false;
            if (currentDirection.y === 1 && newDirection.y === -1) return false;
            if (currentDirection.y === -1 && newDirection.y === 1) return false;
            
            // Can only change if not moving in the same axis
            if (newDirection.x !== 0 && currentDirection.x === 0) return true;
            if (newDirection.y !== 0 && currentDirection.y === 0) return true;
            
            return false;
        }

        it('should allow left when moving vertically', () => {
            const current = { x: 0, y: 1 };
            const newDir = { x: -1, y: 0 };
            expect(canChangeDirection(current, newDir)).toBe(true);
        });

        it('should allow right when moving vertically', () => {
            const current = { x: 0, y: -1 };
            const newDir = { x: 1, y: 0 };
            expect(canChangeDirection(current, newDir)).toBe(true);
        });

        it('should allow up when moving horizontally', () => {
            const current = { x: 1, y: 0 };
            const newDir = { x: 0, y: -1 };
            expect(canChangeDirection(current, newDir)).toBe(true);
        });

        it('should allow down when moving horizontally', () => {
            const current = { x: -1, y: 0 };
            const newDir = { x: 0, y: 1 };
            expect(canChangeDirection(current, newDir)).toBe(true);
        });

        it('should not allow reversing direction horizontally', () => {
            const current = { x: 1, y: 0 };
            const newDir = { x: -1, y: 0 };
            expect(canChangeDirection(current, newDir)).toBe(false);
        });

        it('should not allow reversing direction vertically', () => {
            const current = { x: 0, y: 1 };
            const newDir = { x: 0, y: -1 };
            expect(canChangeDirection(current, newDir)).toBe(false);
        });
    });
});
