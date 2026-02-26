import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AddEmployeeForm from './AddEmployeeForm';
import EmployeeList from './EmployeeList';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const EmployeeManagement = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAddSuccess = () => {
    setIsDialogOpen(false);
    setRefreshTrigger(prev => prev + 1); // Trigger refresh of employee list
  };

  const handleAddEmployee = () => {
    setIsDialogOpen(true);
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
  };

  return (
    <>
      <EmployeeList 
        onAddEmployee={handleAddEmployee} 
        refreshTrigger={refreshTrigger}
        title="Consultants"
        emptyTitle="No consultants found"
        emptySubtitle="Get started by adding your first consultant"
        addButtonLabel="Add Consultant"
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Consultant
            </DialogTitle>
          </DialogHeader>
          <AddEmployeeForm onSuccess={handleAddSuccess} onCancel={handleCancel} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EmployeeManagement;
