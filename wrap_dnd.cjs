const fs = require('fs');

const path = 'src/components/Dashboard.tsx';
const lines = fs.readFileSync(path, 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.includes('grid-cols-2 grid-flow-row-dense gap-4 md:gap-6 min-h-[100px] px-1 pb-6 transition-transform duration-300 transform-gpu origin-top'));
// Line before is `      {/* 1. Main Stats Widget */}`

const endIdx = 2445; // The `      </div>`

if (startIdx === -1) {
  console.log('Start index not found!');
  process.exit(1);
}

// 1. Change the opening tag
const newStart = `      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <SortableContext items={widgets.filter(w => w.visible).map(w => w.id)} strategy={rectSortingStrategy}>
        <div 
          onPointerDownCapture={(e) => {
            if (isEditingLayout) {
              e.stopPropagation();
            }
          }}
          className={cn(
          "grid grid-cols-2 grid-flow-row-dense gap-4 md:gap-6 min-h-[100px] px-1 pb-6 transition-transform duration-300 transform-gpu origin-top",
          ""
        )}
        >
`;

lines.splice(startIdx - 1, 6, newStart);

// Let's re-find the end index because splice shifted it
const newEndIdx = lines.findIndex((l, i) => i > startIdx && l.includes('</SortableWidget>')) + 4; // usually a few lines below `</SortableWidget>`

const newEnd = `      </div>
      </SortableContext>
      <DragOverlay>
        {activeId ? (
          <div className="rounded-[2.6rem] border-2 border-dashed border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/80 shadow-2xl scale-[1.05] p-2.5 min-h-[140px] flex flex-col items-center justify-center opacity-90 backdrop-blur-sm z-50">
             <span className="text-[12px] font-black uppercase text-indigo-500">
               {widgets.find(w => w.id === activeId)?.name || 'Przenoszenie...'}
             </span>
          </div>
        ) : null}
      </DragOverlay>
      </DndContext>`;

lines.splice(newEndIdx, 1, newEnd);

fs.writeFileSync(path, lines.join('\n'));
console.log('Wrapped with DndContext successfully!');
