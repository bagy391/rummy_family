-- Alter status check constraint to allow 'paid'
ALTER TABLE public.payment_records DROP CONSTRAINT IF EXISTS payment_records_status_check;
ALTER TABLE public.payment_records ADD CONSTRAINT payment_records_status_check CHECK (status IN ('pending', 'paid', 'completed'));

-- Drop the old update policy
DROP POLICY IF EXISTS "Payees can update payment confirmations" ON public.payment_records;

-- Create a new policy that allows both payees and payers to update
CREATE POLICY "Payees and payers can update payment records" ON public.payment_records
    FOR UPDATE USING (
        payee_id = auth.uid() OR payer_id = auth.uid()
    );
